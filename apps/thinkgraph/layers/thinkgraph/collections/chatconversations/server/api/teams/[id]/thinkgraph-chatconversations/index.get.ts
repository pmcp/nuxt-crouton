// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getAllThinkgraphChatConversations, getThinkgraphChatConversationsByIds, getThinkgraphChatConversationByNodeId } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const query = getQuery(event)

  const dbTimer = timing.start('db')

  // Look up by nodeId — returns single conversation or null
  if (query.nodeId) {
    const result = await getThinkgraphChatConversationByNodeId(team.id, String(query.nodeId))
    dbTimer.end()
    return result
  }

  if (query.ids) {
    const ids = String(query.ids).split(',')
    const result = await getThinkgraphChatConversationsByIds(team.id, ids)
    dbTimer.end()
    return result
  }

  const result = await getAllThinkgraphChatConversations(team.id)
  dbTimer.end()
  return result
})