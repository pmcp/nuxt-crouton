/**
 * Graph validation utility for ThinkGraph.
 * Detects integrity issues: broken refs, orphans, duplicates, stale nodes.
 */
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

export type ValidationSeverity = 'error' | 'warning'

export type ValidationIssueType =
  | 'broken-context-ref'
  | 'broken-depends-on-ref'
  | 'orphaned-node'
  | 'duplicate-title'
  | 'stale-active'

export interface ValidationIssue {
  severity: ValidationSeverity
  nodeId: string
  nodeTitle: string
  issueType: ValidationIssueType
  message: string
  /** Related node IDs (e.g. the broken ref target) */
  relatedIds?: string[]
}

export interface ValidationResult {
  issues: ValidationIssue[]
  stats: {
    totalNodes: number
    errors: number
    warnings: number
    checkedAt: string
  }
}

/** Shape of a node row returned by getAllThinkgraphNodes (with joined fields) */
interface GraphNode {
  id: string
  title?: string
  content?: string
  parentId?: string
  depth?: number
  projectId?: string
  status?: string
  sessionId?: string
  contextNodeIds?: string[] | string | null
  dependsOn?: string[] | string | null
}

/**
 * Validate graph integrity for a team/project.
 * Loads all nodes once and runs all checks in-memory.
 */
export async function validateGraph(
  teamId: string,
  projectId?: string,
): Promise<ValidationResult> {
  const allNodes = await getAllThinkgraphNodes(teamId, projectId) as GraphNode[]
  const nodeIds = new Set(allNodes.map(n => n.id))
  const nodeById = new Map(allNodes.map(n => [n.id, n]))
  const issues: ValidationIssue[] = []

  for (const n of allNodes) {
    const title = n.title || n.content || '(untitled)'

    // 1. Broken contextNodeIds
    const contextIds = parseJsonArray(n.contextNodeIds)
    for (const refId of contextIds) {
      if (!nodeIds.has(refId)) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          nodeTitle: title,
          issueType: 'broken-context-ref',
          message: `contextNodeIds references non-existent node "${refId}"`,
          relatedIds: [refId],
        })
      }
    }

    // 2. Broken dependsOn refs
    const dependsOnIds = parseJsonArray(n.dependsOn)
    for (const refId of dependsOnIds) {
      if (!nodeIds.has(refId)) {
        issues.push({
          severity: 'error',
          nodeId: n.id,
          nodeTitle: title,
          issueType: 'broken-depends-on-ref',
          message: `dependsOn references non-existent node "${refId}"`,
          relatedIds: [refId],
        })
      }
    }

    // 3. Orphaned nodes — no parentId and not a root (depth > 0)
    if (!n.parentId && (n.depth ?? 0) > 0) {
      issues.push({
        severity: 'warning',
        nodeId: n.id,
        nodeTitle: title,
        issueType: 'orphaned-node',
        message: `Node at depth ${n.depth} has no parent — likely orphaned`,
      })
    }

    // 4. Stale active status
    // No updatedAt column — use sessionId presence as a heuristic:
    // if status is active/working but no sessionId, it's likely stale.
    if (n.status === 'active' || n.status === 'working') {
      if (!n.sessionId) {
        issues.push({
          severity: 'warning',
          nodeId: n.id,
          nodeTitle: title,
          issueType: 'stale-active',
          message: `Node is "${n.status}" but has no active session — possibly stale`,
        })
      }
    }
  }

  // 5. Duplicate titles at same depth (batch check)
  const byDepthAndTitle = new Map<string, string[]>()
  for (const n of allNodes) {
    const key = `${n.projectId}:${n.depth ?? 0}:${(n.title || '').toLowerCase().trim()}`
    if (!byDepthAndTitle.has(key)) {
      byDepthAndTitle.set(key, [])
    }
    byDepthAndTitle.get(key)!.push(n.id)
  }

  for (const [key, ids] of byDepthAndTitle) {
    if (ids.length > 1) {
      const title = key.split(':').slice(2).join(':')
      for (const id of ids) {
        const n = nodeById.get(id)
        issues.push({
          severity: 'warning',
          nodeId: id,
          nodeTitle: n?.title || title,
          issueType: 'duplicate-title',
          message: `Duplicate title "${n?.title || title}" at depth ${n?.depth ?? 0} (${ids.length} nodes)`,
          relatedIds: ids.filter(otherId => otherId !== id),
        })
      }
    }
  }

  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length

  return {
    issues,
    stats: {
      totalNodes: allNodes.length,
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    },
  }
}

/** Safely parse a JSON array field that may be string, array, object, or null */
function parseJsonArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string')
  if (typeof value === 'object') return Object.keys(value)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((v: unknown) => typeof v === 'string')
      if (typeof parsed === 'object' && parsed !== null) return Object.keys(parsed)
    }
    catch { /* ignore */ }
  }
  return []
}
