import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g

interface WikiLinkRef {
  raw: string
  isIdRef: boolean
  value: string // nodeId (without #) or title
}

interface ResolvedWikiLinks {
  /** Node IDs resolved from wiki links */
  resolvedIds: string[]
  /** Warnings for ambiguous or unresolved links */
  warnings: Array<{ link: string, reason: string }>
}

/**
 * Extract all [[wiki links]] from text.
 */
export function extractWikiLinks(text: string): WikiLinkRef[] {
  const refs: WikiLinkRef[] = []
  for (const match of text.matchAll(WIKI_LINK_RE)) {
    const inner = match[1]
    const isIdRef = inner.startsWith('#')
    refs.push({
      raw: match[0],
      isIdRef,
      value: isIdRef ? inner.slice(1) : inner,
    })
  }
  return refs
}

/**
 * Resolve wiki link references to node IDs within a project.
 * - [[#nodeId]] → direct ID lookup
 * - [[node title]] → fuzzy title match within project scope
 */
export async function resolveWikiLinks(
  teamId: string,
  projectId: string,
  refs: WikiLinkRef[],
): Promise<ResolvedWikiLinks> {
  if (!refs.length) return { resolvedIds: [], warnings: [] }

  const allNodes = await getAllThinkgraphNodes(teamId, projectId)
  const nodeById = new Map(allNodes.map((n: any) => [n.id, n]))

  // Build title index: lowercase title → node(s)
  const nodesByTitle = new Map<string, any[]>()
  for (const node of allNodes) {
    const key = ((node as any).title || '').toLowerCase().trim()
    if (key) {
      const existing = nodesByTitle.get(key) || []
      existing.push(node)
      nodesByTitle.set(key, existing)
    }
  }

  const resolvedIds: string[] = []
  const warnings: ResolvedWikiLinks['warnings'] = []

  for (const ref of refs) {
    if (ref.isIdRef) {
      // Direct ID reference
      if (nodeById.has(ref.value)) {
        resolvedIds.push(ref.value)
      } else {
        warnings.push({ link: ref.raw, reason: `Node ID "${ref.value}" not found` })
      }
    } else {
      // Title-based lookup
      const key = ref.value.toLowerCase().trim()
      const matches = nodesByTitle.get(key) || []

      if (matches.length === 1) {
        resolvedIds.push(matches[0].id)
      } else if (matches.length > 1) {
        // Ambiguous — resolve to first but warn
        resolvedIds.push(matches[0].id)
        warnings.push({
          link: ref.raw,
          reason: `Ambiguous: ${matches.length} nodes match title "${ref.value}"`,
        })
      } else {
        warnings.push({ link: ref.raw, reason: `No node found with title "${ref.value}"` })
      }
    }
  }

  return { resolvedIds: [...new Set(resolvedIds)], warnings }
}

/**
 * Extract wiki links from brief and output, resolve them, and merge into contextNodeIds.
 * Returns the merged contextNodeIds array (deduped).
 */
export async function resolveWikiLinksForNode(
  teamId: string,
  projectId: string,
  nodeId: string,
  brief?: string | null,
  output?: string | null,
  existingContextNodeIds?: string[] | null,
): Promise<{ contextNodeIds: string[], warnings: ResolvedWikiLinks['warnings'] }> {
  const allText = [brief || '', output || ''].join('\n')
  const refs = extractWikiLinks(allText)

  if (!refs.length) {
    return { contextNodeIds: existingContextNodeIds || [], warnings: [] }
  }

  const { resolvedIds, warnings } = await resolveWikiLinks(teamId, projectId, refs)

  // Filter out self-references
  const validIds = resolvedIds.filter(id => id !== nodeId)

  // Merge with existing contextNodeIds (dedup)
  const existing = existingContextNodeIds || []
  const merged = [...new Set([...existing, ...validIds])]

  return { contextNodeIds: merged, warnings }
}
