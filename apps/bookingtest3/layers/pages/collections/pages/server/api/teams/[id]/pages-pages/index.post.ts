// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createPagesPage, getPagesPagesByIds } from '../../../../database/queries'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody(event)

  // Exclude id field (we generate it for path calculation)
  const { id, ...dataWithoutId } = body

  // Generate ID upfront for correct path calculation
  const recordId = nanoid()

  // Calculate path based on parentId
  let path = `/${recordId}/`
  let depth = 0

  if (dataWithoutId.parentId) {
    const [parent] = await getPagesPagesByIds(team.id, [dataWithoutId.parentId])
    if (parent) {
      path = `${parent.path}${recordId}/`
      depth = (parent.depth || 0) + 1
    }
  }

  // Convert date string to Date object
  if (dataWithoutId.publishedAt) {
    dataWithoutId.publishedAt = new Date(dataWithoutId.publishedAt)
  }
  return await createPagesPage({
    ...dataWithoutId,
    id: recordId,
    path,
    depth,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
})