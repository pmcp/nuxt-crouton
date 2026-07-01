/**
 * POST /api/teams/:id/worker-auth
 *
 * Issues a short-lived service token for the Pi worker.
 * The worker authenticates with user credentials (session cookie),
 * gets a scoped token it can use for WebSocket and API calls.
 *
 * Token is stored in KV and valid for 24 hours.
 */
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  // Generate a random service token
  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

  // Store in KV with team scope
  await useStorage('kv').setItem(`worker-token:${token}`, {
    teamId: team.id,
    expiresAt,
  })

  return {
    token,
    expiresAt,
    teamId: team.id,
  }
})
