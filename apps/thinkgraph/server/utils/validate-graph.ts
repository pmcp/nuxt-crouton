/**
 * Graph validation for ThinkGraph (Phase 1B).
 *
 * Pure function: walks all nodes in a project and reports integrity issues.
 * Used by:
 *   - GET /api/teams/[id]/thinkgraph-nodes/validate
 *   - MCP tool `check-graph`
 */
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { validateWikiLinks } from './validate-wiki-links'

export type ValidationCode =
  | 'broken-context-ref'
  | 'broken-depends-on'
  | 'orphan-node'
  | 'duplicate-title-at-depth'
  | 'stuck-active'
  | 'broken-wiki-link'

export interface ValidationError {
  nodeId: string
  severity: 'error' | 'warning'
  code: ValidationCode
  message: string
  details?: Record<string, any>
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Validate a single project's graph.
 * teamId is the resolved team UUID; projectId is required to scope the check.
 */
export async function validateGraph(
  teamId: string,
  projectId: string,
): Promise<ValidationError[]> {
  const nodes = await getAllThinkgraphNodes(teamId, projectId)
  const errors: ValidationError[] = []

  if (nodes.length === 0) return errors

  const nodeById = new Map<string, any>(nodes.map((n: any) => [n.id, n]))
  const now = Date.now()

  // 1. broken-context-ref + broken-depends-on
  for (const node of nodes) {
    const contextIds: string[] = Array.isArray(node.contextNodeIds) ? node.contextNodeIds : []
    for (const targetId of contextIds) {
      const target = nodeById.get(targetId)
      if (!target) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          code: 'broken-context-ref',
          message: `Context reference points to missing node "${targetId}"`,
          details: { targetId },
        })
      } else if (target.projectId !== node.projectId || target.teamId !== node.teamId) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          code: 'broken-context-ref',
          message: `Context reference "${targetId}" belongs to a different project or team`,
          details: { targetId, targetProjectId: target.projectId },
        })
      }
    }

    const dependsOn: string[] = Array.isArray(node.dependsOn) ? node.dependsOn : []
    for (const targetId of dependsOn) {
      if (!nodeById.has(targetId)) {
        errors.push({
          nodeId: node.id,
          severity: 'error',
          code: 'broken-depends-on',
          message: `dependsOn references missing node "${targetId}"`,
          details: { targetId },
        })
      }
    }
  }

  // 2. orphan-node
  // - parentId set but parent not found in project → orphan
  // - parentId null and not the project root → orphan
  // The "project root" is the single parentId-null node with the lowest order.
  const topLevel = nodes
    .filter((n: any) => !n.parentId)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  const projectRootId: string | null = topLevel[0]?.id ?? null

  for (const node of nodes) {
    if (node.parentId) {
      if (!nodeById.has(node.parentId)) {
        errors.push({
          nodeId: node.id,
          severity: 'warning',
          code: 'orphan-node',
          message: `Parent node "${node.parentId}" no longer exists`,
          details: { parentId: node.parentId },
        })
      }
    } else if (node.id !== projectRootId) {
      errors.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'orphan-node',
        message: 'Top-level node has no parent and is not the project root',
      })
    }
  }

  // 3. duplicate-title-at-depth — siblings under the same parent with the same title
  const siblingGroups = new Map<string, Map<string, string[]>>()
  for (const node of nodes) {
    const parentKey = node.parentId ?? '__root__'
    const titleKey = (node.title || '').toLowerCase().trim()
    if (!titleKey) continue
    if (!siblingGroups.has(parentKey)) siblingGroups.set(parentKey, new Map())
    const titles = siblingGroups.get(parentKey)!
    const existing = titles.get(titleKey) || []
    existing.push(node.id)
    titles.set(titleKey, existing)
  }
  for (const [, titles] of siblingGroups) {
    for (const [titleKey, ids] of titles) {
      if (ids.length > 1) {
        for (const id of ids) {
          errors.push({
            nodeId: id,
            severity: 'warning',
            code: 'duplicate-title-at-depth',
            message: `Duplicate title "${titleKey}" among siblings`,
            details: { siblingIds: ids },
          })
        }
      }
    }
  }

  // 4. stuck-active — status='active' and updatedAt > 24h ago
  for (const node of nodes) {
    if (node.status !== 'active') continue
    if (!node.updatedAt) continue
    const updatedMs = Date.parse(node.updatedAt)
    if (Number.isNaN(updatedMs)) continue
    if (now - updatedMs > ONE_DAY_MS) {
      errors.push({
        nodeId: node.id,
        severity: 'warning',
        code: 'stuck-active',
        message: `Node has been 'active' since ${node.updatedAt} (>24h)`,
        details: { updatedAt: node.updatedAt },
      })
    }
  }

  // 5. broken-wiki-link — delegate to existing validator
  const wikiIssues = validateWikiLinks(
    nodes.map((n: any) => ({
      id: n.id,
      title: n.title,
      brief: n.brief,
      output: n.output,
      projectId: n.projectId,
    })),
  )
  for (const issue of wikiIssues) {
    errors.push({
      nodeId: issue.nodeId,
      severity: 'warning',
      code: 'broken-wiki-link',
      message: issue.message,
    })
  }

  return errors
}
