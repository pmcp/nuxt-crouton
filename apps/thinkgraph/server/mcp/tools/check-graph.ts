import { z } from 'zod'
import { validateGraph, type ValidationItem } from '~~/server/utils/validate-graph'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Check a project graph for integrity issues: broken context references, broken/cyclic dependsOn, orphan nodes, duplicate sibling titles, nodes stuck in active or working state, unknown pipeline step types, and unresolved wiki links. Returns a human-readable report grouped by severity.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    projectId: z.string().optional().describe('Project ID to validate (omit to check the whole team)'),
    severity: z.enum(['error', 'warning', 'info']).optional().describe('Filter by severity (defaults to all)'),
  },
  async handler({ teamId, projectId, severity }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const report = await validateGraph(resolvedTeamId, projectId)

      const buckets: Array<['error' | 'warning' | 'info', ValidationItem[]]> = [
        ['error', report.errors],
        ['warning', report.warnings],
        ['info', report.info],
      ]
      const visible = severity ? buckets.filter(([s]) => s === severity) : buckets
      const total = visible.reduce((sum, [, items]) => sum + items.length, 0)

      const scope = projectId ? `project "${projectId}"` : `team "${teamId}"`
      if (total === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `Graph check passed: no ${severity ?? 'integrity'} issues found in ${scope}.`,
          }],
        }
      }

      const counts = `${report.errors.length} error(s), ${report.warnings.length} warning(s), ${report.info.length} info`
      let text = `Graph check for ${scope}: ${counts}\n\n`

      for (const [sev, items] of visible) {
        if (items.length === 0) continue
        const byKind = new Map<string, ValidationItem[]>()
        for (const item of items) {
          const list = byKind.get(item.kind) || []
          list.push(item)
          byKind.set(item.kind, list)
        }
        for (const [kind, group] of byKind) {
          text += `## ${kind} (${group.length}, ${sev})\n`
          for (const item of group) {
            text += `- node ${item.nodeId}: ${item.message}\n`
          }
          text += '\n'
        }
      }

      return { content: [{ type: 'text' as const, text: text.trim() }] }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
