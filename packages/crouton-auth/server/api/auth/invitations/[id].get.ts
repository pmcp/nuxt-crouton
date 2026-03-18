/**
 * Get public invitation details (no auth required)
 *
 * Returns team name, inviter name, role, and status for an invitation.
 * Used by the accept-invitation page to show context before login/register.
 */
import { eq } from 'drizzle-orm'
import { invitation, organization, user } from '../../../database/schema/auth'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ status: 400, statusText: 'Invitation ID is required' })
  }

  // useDB() is NuxtHub's auto-imported server util that returns a Drizzle instance
  const db = useDB()

  const result = await (db as any)
    .select({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organizationName: organization.name,
      organizationLogo: organization.logo,
      organizationSlug: organization.slug,
      inviterName: user.name,
    })
    .from(invitation)
    .innerJoin(organization, eq(invitation.organizationId as any, organization.id))
    .innerJoin(user, eq(invitation.inviterId as any, user.id))
    .where(eq(invitation.id as any, id))
    .get()

  if (!result) {
    throw createError({ status: 404, statusText: 'Invitation not found' })
  }

  const now = new Date()
  const expired = result.expiresAt && new Date(result.expiresAt) < now

  return {
    id: result.id,
    email: result.email,
    role: result.role,
    status: expired ? 'expired' : result.status,
    organizationName: result.organizationName,
    organizationLogo: result.organizationLogo,
    organizationSlug: result.organizationSlug,
    inviterName: result.inviterName,
  }
})
