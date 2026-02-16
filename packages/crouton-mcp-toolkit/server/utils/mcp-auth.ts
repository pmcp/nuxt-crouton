import type { H3Event } from 'h3'

/**
 * Authenticate an MCP request and verify team membership.
 *
 * Since MCP Toolkit runs inside the Nuxt server process, the H3 event
 * carries session cookies. We delegate to crouton-auth's team resolution.
 */
export async function requireMcpAuth(event: H3Event, teamId: string) {
  // Import dynamically to avoid hard dependency on crouton-auth
  const { resolveTeamAndCheckMembership } = await import('@fyit/crouton-auth/server/utils/team')

  // Set the team ID param so resolveTeamAndCheckMembership can find it
  event.context.params = event.context.params || {}
  event.context.params.id = teamId

  return await resolveTeamAndCheckMembership(event)
}
