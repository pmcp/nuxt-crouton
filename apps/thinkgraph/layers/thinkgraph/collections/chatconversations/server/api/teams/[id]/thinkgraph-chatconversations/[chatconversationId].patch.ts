// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphChatConversation } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ThinkgraphChatConversation } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { chatconversationId } = getRouterParams(event)
  if (!chatconversationId) {
    throw createError({ status: 400, statusText: 'Missing chatconversation ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ThinkgraphChatConversation>>(event)

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphChatConversation(chatconversationId, team.id, user.id, {
    nodeId: body.nodeId,
    title: body.title,
    messages: body.messages,
    provider: body.provider,
    model: body.model,
    systemPrompt: body.systemPrompt,
    metadata: body.metadata,
    messageCount: body.messageCount,
    lastMessageAt: body.lastMessageAt ? new Date(body.lastMessageAt) : body.lastMessageAt
  }, { role: membership.role })
  dbTimer.end()
  return result
})