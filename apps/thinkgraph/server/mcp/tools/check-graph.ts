import { z } from 'zod'
import { validateGraph } from '~~/server/utils/validate-graph'
import { resolveTeamId } from '../utils/resolve-team'

export default defineMcpTool({
  description: 'Check a project graph for integrity issues: broken context references, orphan nodes, duplicate sibling titles, nodes stuck in active state, and unresolved wiki links. Returns a human-readable report grouped by severity.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    projectId: z.string().describe('Project ID to validate'),
    severity: z.enum(['error', 'warning']).optional().describe('Filter by severity (defaults to all)'),
  },
  async handler({ teamId, projectId, severity }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const allErrors = await validateGraph(resolvedTeamId, projectId)
      const errors = severity ? allErrors.filter(e => e.severity === severity) : allErrors

      if (errors.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `Graph check passed: no ${severity ?? 'integrity'} issues found in project "${projectId}".`,
          }],
        }
      }

      const errorCount = errors.filter(e => e.severity === 'error').length
      const warningCount = errors.filter(e => e.severity === 'warning').length

      const byCode = new Map<string, typeof errors>()
      for (const err of errors) {
        const list = byCode.get(err.code) || []
        list.push(err)
        byCode.set(err.code, list)
      }

      let report = `Graph check for project "${projectId}": ${errorCount} error(s), ${warningCount} warning(s)\n\n`
      for (const [code, items] of byCode) {
        report += `## ${code} (${items.length})\n`
        for (const item of items) {
          report += `- [${item.severity}] node ${item.nodeId}: ${item.message}\n`
        }
        report += '\n'
      }

      return { content: [{ type: 'text' as const, text: report.trim() }] }
    } catch (error: any) {
      return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }], isError: true }
    }
  },
})
