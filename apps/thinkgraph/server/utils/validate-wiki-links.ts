/**
 * Wiki link validation for ThinkGraph graph checks.
 * Detects unresolved [[wiki links]] in node brief and output text.
 *
 * Designed to be integrated into validate-graph.ts (from PR #42)
 * as an additional check pass.
 */
import { extractWikiLinks } from './wiki-links'

interface WikiLinkIssue {
  severity: 'warning'
  nodeId: string
  nodeTitle: string
  issueType: 'unresolved-wiki-link'
  message: string
}

/**
 * Check all nodes for unresolved [[wiki links]].
 * Pass in all nodes from getAllThinkgraphNodes so we can do title resolution in-memory.
 */
export function validateWikiLinks(
  allNodes: Array<{ id: string; title?: string; brief?: string; output?: string; projectId?: string }>,
): WikiLinkIssue[] {
  const issues: WikiLinkIssue[] = []

  // Build title index per project: project → lowercase title → nodeId[]
  const titleIndex = new Map<string, Map<string, string[]>>()
  const nodeIds = new Set(allNodes.map(n => n.id))

  for (const node of allNodes) {
    const proj = node.projectId || '__none__'
    if (!titleIndex.has(proj)) titleIndex.set(proj, new Map())
    const projIndex = titleIndex.get(proj)!
    const key = (node.title || '').toLowerCase().trim()
    if (key) {
      const existing = projIndex.get(key) || []
      existing.push(node.id)
      projIndex.set(key, existing)
    }
  }

  for (const node of allNodes) {
    const title = node.title || '(untitled)'
    const allText = [node.brief || '', node.output || ''].join('\n')
    const refs = extractWikiLinks(allText)

    for (const ref of refs) {
      if (ref.isIdRef) {
        // [[#nodeId]] — check if ID exists
        if (!nodeIds.has(ref.value)) {
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            nodeTitle: title,
            issueType: 'unresolved-wiki-link',
            message: `Wiki link [[#${ref.value}]] references non-existent node`,
          })
        }
      } else {
        // [[title]] — check if title resolves
        const proj = node.projectId || '__none__'
        const projIndex = titleIndex.get(proj)
        const key = ref.value.toLowerCase().trim()
        const matches = projIndex?.get(key) || []

        if (matches.length === 0) {
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            nodeTitle: title,
            issueType: 'unresolved-wiki-link',
            message: `Wiki link [[${ref.value}]] doesn't match any node title`,
          })
        } else if (matches.length > 1) {
          issues.push({
            severity: 'warning',
            nodeId: node.id,
            nodeTitle: title,
            issueType: 'unresolved-wiki-link',
            message: `Wiki link [[${ref.value}]] is ambiguous — matches ${matches.length} nodes`,
          })
        }
      }
    }
  }

  return issues
}
