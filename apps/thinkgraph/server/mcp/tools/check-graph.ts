import { z } from 'zod'
import { resolveTeamId } from '../utils/resolve-team'
import { validateGraph } from '~~/server/utils/validate-graph'

export default defineMcpTool({
  description: 'Check the thinking graph for integrity issues. Detects broken references (contextNodeIds, dependsOn), orphaned nodes, duplicate titles, and stale active nodes. Returns a summary of issues with severity levels.',
  inputSchema: {
    teamId: z.string().describe('Team ID or slug'),
    graphId: z.string().optional().describe('Project/graph ID to check (if omitted, checks all nodes for the team)'),
  },
  async handler({ teamId, graphId }) {
    try {
      const resolvedTeamId = await resolveTeamId(teamId)
      const result = await validateGraph(resolvedTeamId, graphId)

      if (result.issues.length === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `✅ Graph is clean — ${result.stats.totalNodes} nodes checked, no issues found.`,
          }],
        }
      }

      // Group issues by type for readability
      const errors = result.issues.filter(i => i.severity === 'error')
      const warnings = result.issues.filter(i => i.severity === 'warning')

      let text = `## Graph Validation Report\n\n`
      text += `**${result.stats.totalNodes} nodes** checked | ${result.stats.errors} errors | ${result.stats.warnings} warnings\n\n`

      if (errors.length > 0) {
        text += `### ❌ Errors\n\n`
        for (const issue of errors) {
          text += `- **${issue.nodeTitle}** [${issue.nodeId}]: ${issue.message}\n`
        }
        text += '\n'
      }

      if (warnings.length > 0) {
        text += `### ⚠️ Warnings\n\n`
        for (const issue of warnings) {
          text += `- **${issue.nodeTitle}** [${issue.nodeId}]: ${issue.message}\n`
        }
        text += '\n'
      }

      return { content: [{ type: 'text' as const, text }] }
    }
    catch (error: any) {
      return {
        content: [{ type: 'text' as const, text: `Error running graph validation: ${error.message}` }],
        isError: true,
      }
    }
  },
})
