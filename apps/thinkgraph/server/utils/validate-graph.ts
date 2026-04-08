/**
 * Graph validation for ThinkGraph (Phase 1B).
 *
 * Pure function: walks all nodes in a project (or across all projects in a team
 * when projectId is omitted) and reports integrity issues.
 *
 * Used by:
 *   - GET /api/teams/[id]/thinkgraph-nodes/validate
 *   - MCP tool `check-graph`
 */
import { getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { validateWikiLinks } from './validate-wiki-links'

export type ValidationKind =
  | 'broken-context-ref'
  | 'broken-depends-on'
  | 'cycle-depends-on'
  | 'orphan-node'
  | 'disconnected-node'
  | 'duplicate-title-at-depth'
  | 'stuck-active'
  | 'stuck-worker'
  | 'broken-wiki-link'
  | 'unknown-step-type'

/** Legacy alias — older callers imported `ValidationCode`. */
export type ValidationCode = ValidationKind

export interface ValidationItem {
  nodeId: string
  message: string
  kind: ValidationKind
  details?: Record<string, any>
}

export interface ValidationReport {
  errors: ValidationItem[]
  warnings: ValidationItem[]
  info: ValidationItem[]
}

type Severity = 'error' | 'warning' | 'info'
interface InternalIssue extends ValidationItem {
  severity: Severity
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const STUCK_WORKER_MS = 30 * 60 * 1000

/** Canonical pipeline step names. Mirror of ThinkgraphStep in collections/nodes/types.ts. */
const VALID_STEPS: ReadonlySet<string> = new Set([
  'analyst',
  'builder',
  'reviewer',
  'launcher',
  'merger',
  'coach',
  'analyse',
  'synthesize',
  'optimizer',
])

/**
 * Validate a team's graph. If projectId is given, only that project is checked.
 * Otherwise nodes are grouped by project internally so per-project checks
 * (orphan, sibling duplicates) don't bleed across projects.
 */
export async function validateGraph(
  teamId: string,
  projectId?: string,
): Promise<ValidationReport> {
  const nodes = await getAllThinkgraphNodes(teamId, projectId)
  const issues: InternalIssue[] = []

  if (nodes.length === 0) return bucketize(issues)

  if (projectId) {
    runProjectChecks(nodes, issues)
  } else {
    const byProject = new Map<string, any[]>()
    for (const n of nodes) {
      const key = n.projectId ?? '__no_project__'
      const list = byProject.get(key) ?? []
      list.push(n)
      byProject.set(key, list)
    }
    for (const projectNodes of byProject.values()) {
      runProjectChecks(projectNodes, issues)
    }
  }

  return bucketize(issues)
}

function bucketize(issues: InternalIssue[]): ValidationReport {
  const report: ValidationReport = { errors: [], warnings: [], info: [] }
  for (const i of issues) {
    const item: ValidationItem = { nodeId: i.nodeId, message: i.message, kind: i.kind }
    if (i.details) item.details = i.details
    if (i.severity === 'error') report.errors.push(item)
    else if (i.severity === 'warning') report.warnings.push(item)
    else report.info.push(item)
  }
  return report
}

function runProjectChecks(nodes: any[], issues: InternalIssue[]): void {
  const nodeById = new Map<string, any>(nodes.map(n => [n.id, n]))
  const now = Date.now()

  // 1. broken-context-ref + broken-depends-on
  for (const node of nodes) {
    const contextIds: string[] = Array.isArray(node.contextNodeIds) ? node.contextNodeIds : []
    for (const targetId of contextIds) {
      const target = nodeById.get(targetId)
      if (!target) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          kind: 'broken-context-ref',
          message: `Context reference points to missing node "${targetId}"`,
          details: { targetId },
        })
      } else if (target.projectId !== node.projectId || target.teamId !== node.teamId) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          kind: 'broken-context-ref',
          message: `Context reference "${targetId}" belongs to a different project or team`,
          details: { targetId, targetProjectId: target.projectId },
        })
      }
    }

    const dependsOn: string[] = Array.isArray(node.dependsOn) ? node.dependsOn : []
    for (const targetId of dependsOn) {
      if (!nodeById.has(targetId)) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          kind: 'broken-depends-on',
          message: `dependsOn references missing node "${targetId}"`,
          details: { targetId },
        })
      }
    }
  }

  // 1b. disconnected-node — no incoming/outgoing edges (context or dependsOn),
  // not pinned, not idle. Matches the spec'd "orphan" definition (distinct from
  // the parent-tree orphan check below). Idle nodes are excluded because raw-input
  // ideas are *expected* to live unconnected until triaged.
  const incomingEdges = new Map<string, number>()
  for (const node of nodes) {
    const ctx = Array.isArray(node.contextNodeIds) ? node.contextNodeIds : []
    const deps = Array.isArray(node.dependsOn) ? node.dependsOn : []
    for (const targetId of [...ctx, ...deps]) {
      if (nodeById.has(targetId)) {
        incomingEdges.set(targetId, (incomingEdges.get(targetId) ?? 0) + 1)
      }
    }
  }
  for (const node of nodes) {
    if (node.pinned === true) continue
    if (node.status === 'idle') continue
    const outCtx = Array.isArray(node.contextNodeIds) ? node.contextNodeIds.length : 0
    const outDeps = Array.isArray(node.dependsOn) ? node.dependsOn.length : 0
    const incoming = incomingEdges.get(node.id) ?? 0
    if (outCtx === 0 && outDeps === 0 && incoming === 0) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        kind: 'disconnected-node',
        message: 'Node has no incoming or outgoing edges and is not pinned or idle',
        details: { status: node.status },
      })
    }
  }

  // 2. cycle-depends-on — DFS over the dependsOn graph (only resolved targets).
  // Each cycle is reported once, on every node participating in the cycle.
  const dependsAdj = new Map<string, string[]>()
  for (const node of nodes) {
    const deps = Array.isArray(node.dependsOn) ? node.dependsOn : []
    dependsAdj.set(node.id, deps.filter((d: string) => nodeById.has(d)))
  }
  const color = new Map<string, 0 | 1 | 2>() // 0=white,1=gray,2=black
  const stack: string[] = []
  const reportedCycleKeys = new Set<string>()

  function dfs(id: string): void {
    color.set(id, 1)
    stack.push(id)
    for (const next of dependsAdj.get(id) ?? []) {
      const c = color.get(next) ?? 0
      if (c === 1) {
        // Found a back-edge → cycle from `next` down to current top of stack.
        const start = stack.indexOf(next)
        if (start >= 0) {
          const cycle = stack.slice(start)
          // Canonical key: rotate so smallest id is first, then join.
          const minIdx = cycle.reduce((m, _, i) => (cycle[i] < cycle[m] ? i : m), 0)
          const rotated = cycle.slice(minIdx).concat(cycle.slice(0, minIdx))
          const key = rotated.join('->')
          if (!reportedCycleKeys.has(key)) {
            reportedCycleKeys.add(key)
            for (const cid of cycle) {
              issues.push({
                nodeId: cid,
                severity: 'error',
                kind: 'cycle-depends-on',
                message: `dependsOn cycle: ${rotated.join(' → ')} → ${rotated[0]}`,
                details: { cycle: rotated },
              })
            }
          }
        }
      } else if (c === 0) {
        dfs(next)
      }
    }
    stack.pop()
    color.set(id, 2)
  }
  for (const node of nodes) {
    if ((color.get(node.id) ?? 0) === 0) dfs(node.id)
  }

  // 3. orphan-node — parent-based: parent missing, or top-level and not the project root.
  const topLevel = nodes
    .filter((n: any) => !n.parentId)
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  const projectRootId: string | null = topLevel[0]?.id ?? null

  for (const node of nodes) {
    if (node.parentId) {
      if (!nodeById.has(node.parentId)) {
        issues.push({
          nodeId: node.id,
          severity: 'warning',
          kind: 'orphan-node',
          message: `Parent node "${node.parentId}" no longer exists`,
          details: { parentId: node.parentId },
        })
      }
    } else if (node.id !== projectRootId) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        kind: 'orphan-node',
        message: 'Top-level node has no parent and is not the project root',
      })
    }
  }

  // 4. duplicate-title-at-depth — siblings under the same parent with the same title
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
          issues.push({
            nodeId: id,
            severity: 'warning',
            kind: 'duplicate-title-at-depth',
            message: `Duplicate title "${titleKey}" among siblings`,
            details: { siblingIds: ids },
          })
        }
      }
    }
  }

  // 5. stuck-active — status='active' and updatedAt > 24h ago
  for (const node of nodes) {
    if (node.status !== 'active') continue
    if (!node.updatedAt) continue
    const updatedMs = Date.parse(node.updatedAt)
    if (Number.isNaN(updatedMs)) continue
    if (now - updatedMs > ONE_DAY_MS) {
      issues.push({
        nodeId: node.id,
        severity: 'warning',
        kind: 'stuck-active',
        message: `Node has been 'active' since ${node.updatedAt} (>24h)`,
        details: { updatedAt: node.updatedAt },
      })
    }
  }

  // 5b. stuck-worker — status='working'|'dispatching', assignee='pi', updatedAt > 30min ago.
  // Catches the Apr 7 failure mode: Pi worker dispatched a session, the worker→app
  // callback failed (e.g. 502 storm), the in-memory ActiveSession was deleted, and the
  // node is now stranded with no recovery path. Severity is 'error' because (unlike
  // stuck-active, which can mean "human is slow") this state implies dropped delivery.
  for (const node of nodes) {
    if (node.status !== 'working' && node.status !== 'dispatching') continue
    if (node.assignee !== 'pi') continue
    if (!node.updatedAt) continue
    const updatedMs = Date.parse(node.updatedAt)
    if (Number.isNaN(updatedMs)) continue
    if (now - updatedMs > STUCK_WORKER_MS) {
      issues.push({
        nodeId: node.id,
        severity: 'error',
        kind: 'stuck-worker',
        message: `Pi-assigned node stuck in '${node.status}' since ${node.updatedAt} (>30min). Likely dropped worker→app delivery.`,
        details: { updatedAt: node.updatedAt, status: node.status, stage: node.stage },
      })
    }
  }

  // 6. unknown-step-type — entries in node.steps that aren't a canonical pipeline step.
  for (const node of nodes) {
    const steps = Array.isArray(node.steps) ? node.steps : []
    for (const step of steps) {
      if (typeof step !== 'string' || !VALID_STEPS.has(step)) {
        issues.push({
          nodeId: node.id,
          severity: 'error',
          kind: 'unknown-step-type',
          message: `Node references unknown step type "${String(step)}"`,
          details: { step, validSteps: Array.from(VALID_STEPS) },
        })
      }
    }
  }

  // 7. broken-wiki-link — delegate to existing validator
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
    issues.push({
      nodeId: issue.nodeId,
      severity: 'warning',
      kind: 'broken-wiki-link',
      message: issue.message,
    })
  }
}
