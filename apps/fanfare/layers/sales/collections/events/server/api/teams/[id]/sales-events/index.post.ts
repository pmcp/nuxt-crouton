// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createSalesEvent } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1, 'title is required'),
  slug: z.string().min(1, 'slug is required'),
  description: z.string().optional(),
  eventType: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.string().min(1, 'status is required'),
  isCurrent: z.boolean().optional(),
  helperPin: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  archivedAt: z.coerce.date().optional()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

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
  const dbTimer = timing.start('db')
  const result = await createSalesEvent({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})