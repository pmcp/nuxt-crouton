// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createThinkgraphDecision, getAllThinkgraphDecisions } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { spawnClaudeResponse } from '~~/server/utils/claude-responder'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody(event)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  const dbTimer = timing.start('db')
  const result = await createThinkgraphDecision({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()

  // Trigger Claude response for manual nodes only
  // Skip: 'mcp' (Claude CLI), 'ai' (expand), 'dispatch' (dispatch services)
  const isManualNode = !body.source || body.source === '' || body.source === 'manual'
  if (result && isManualNode) {
    try {
      const allNodes = await getAllThinkgraphDecisions(team.id, body.graphId)
      spawnClaudeResponse({
        teamSlug: team.slug,
        teamId: team.id,
        graphId: body.graphId,
        node: {
          id: result.id,
          content: result.content,
          nodeType: result.nodeType,
          parentId: result.parentId,
        },
        allNodes,
      })
    }
    catch (err) {
      // Don't fail the request if Claude spawning fails
      console.error('[claude-responder] Error triggering response:', err)
    }
  }

  return result
})