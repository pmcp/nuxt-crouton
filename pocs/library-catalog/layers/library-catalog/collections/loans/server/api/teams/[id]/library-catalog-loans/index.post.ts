// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createLibraryCatalogLoan } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  bookId: z.string().min(1, 'bookId is required'),
  borrowerName: z.string().min(1, 'borrowerName is required'),
  borrowedAt: z.coerce.date().nullish(),
  dueAt: z.coerce.date().nullish(),
  returnedAt: z.coerce.date().nullish()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // body is the validated payload (id is not part of the schema) — the database generates the id
  const dataWithoutId = body

  // Convert date string to Date object
  if (dataWithoutId.borrowedAt) {
    dataWithoutId.borrowedAt = new Date(dataWithoutId.borrowedAt)
  }
  // Convert date string to Date object
  if (dataWithoutId.dueAt) {
    dataWithoutId.dueAt = new Date(dataWithoutId.dueAt)
  }
  // Convert date string to Date object
  if (dataWithoutId.returnedAt) {
    dataWithoutId.returnedAt = new Date(dataWithoutId.returnedAt)
  }
  const dbTimer = timing.start('db')
  const result = await createLibraryCatalogLoan({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})