// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePeopleContact } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { contactId } = getRouterParams(event)
  if (!contactId) {
    throw createError({ status: 400, statusText: 'Missing contact ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePeopleContact(contactId, team.id, user.id)
})