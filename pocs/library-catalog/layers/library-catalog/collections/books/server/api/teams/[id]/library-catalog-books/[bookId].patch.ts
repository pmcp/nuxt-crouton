// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateLibraryCatalogBook } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1, 'title is required'),
  isbn: z.string().optional(),
  publishedYear: z.number().optional(),
  coverImage: z.string().optional(),
  description: z.string().optional(),
  authorId: z.string().optional(),
  genreId: z.string().optional(),
  copiesTotal: z.number().optional(),
  copiesAvailable: z.number().optional()
}).partial().strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { bookId } = getRouterParams(event)
  if (!bookId) {
    throw createError({ status: 400, statusText: 'Missing book ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Only include fields that were actually sent in the request
  const updates: Record<string, any> = {}
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) {
      updates[key] = value
    }
  }

  const dbTimer = timing.start('db')
  const result = await updateLibraryCatalogBook(bookId, team.id, user.id, updates, { role: membership.role })
  dbTimer.end()
  return result
})