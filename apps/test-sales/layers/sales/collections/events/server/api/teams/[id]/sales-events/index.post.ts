// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createSalesEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  // Convert date string to Date object
  if (dataWithoutId.startDate) {
    dataWithoutId.startDate = new Date(dataWithoutId.startDate)
  }
  // Convert date string to Date object
  if (dataWithoutId.endDate) {
    dataWithoutId.endDate = new Date(dataWithoutId.endDate)
  }
  // Convert date string to Date object
  if (dataWithoutId.archivedAt) {
    dataWithoutId.archivedAt = new Date(dataWithoutId.archivedAt)
  }
  return await createSalesEvent({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
})