// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createLibraryCatalogBook } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1, 'title is required'),
  isbn: z.string().optional(),
  publishedYear: z.number().optional(),
  coverImage: z.string().optional(),
  description: z.string().optional(),
  authorId: z.string().min(1, 'authorId is required'),
  genreId: z.string().optional(),
  copiesTotal: z.number().optional(),
  copiesAvailable: z.number().optional()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // body is the validated payload (id is not part of the schema) — the database generates the id
  const dataWithoutId = body

  const dbTimer = timing.start('db')
  const result = await createLibraryCatalogBook({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})