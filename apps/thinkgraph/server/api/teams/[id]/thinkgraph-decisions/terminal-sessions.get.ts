import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getActiveTerminalSessions } from '~~/server/utils/claude-responder'

/**
 * GET /api/teams/:id/thinkgraph-decisions/terminal-sessions
 *
 * Returns active Claude Code terminal sessions (nodeId + status).
 * Used by the UI to show terminal indicators on nodes.
 */
export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)

  const sessions = getActiveTerminalSessions()
  const result: Array<{ nodeId: string; status: string; lineCount: number }> = []

  for (const [nodeId, session] of sessions) {
    result.push({
      nodeId,
      status: session.status,
      lineCount: session.lines.length,
    })
  }

  return result
})
