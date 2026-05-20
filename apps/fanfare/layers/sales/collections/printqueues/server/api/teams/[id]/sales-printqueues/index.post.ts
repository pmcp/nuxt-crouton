// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { createSalesPrintqueue } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { z } from 'zod'

const bodySchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  orderId: z.string().min(1, 'orderId is required'),
  printerId: z.string().min(1, 'printerId is required'),
  locationId: z.string().optional(),
  status: z.number(),
  printData: z.string().min(1, 'printData is required'),
  printMode: z.string().optional(),
  errorMessage: z.string().optional(),
  retryCount: z.number().optional(),
  completedAt: z.date().optional()
}).strip()

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readValidatedBody(event, bodySchema.parse)

  // Exclude id field to let the database generate it
  const { id, ...dataWithoutId } = body

  const dbTimer = timing.start('db')
  const result = await createSalesPrintqueue({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()
  return result
})