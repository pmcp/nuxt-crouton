import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()
  const flowId = getRouterParam(event, 'flowId')!

  const [existing] = await db
    .select()
    .from(flowConfigs)
    .where(and(eq(flowConfigs.id, flowId), eq(flowConfigs.teamId, team.id)))
    .limit(1)

  if (!existing) {
    throw createError({ status: 404, statusText: 'Flow not found' })
  }

  const body = await readBody(event)

  const updates: Partial<typeof flowConfigs.$inferInsert> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.collection !== undefined) updates.collection = body.collection.trim()
  if (body.labelField !== undefined) updates.labelField = body.labelField.trim()
  if (body.parentField !== undefined) updates.parentField = body.parentField.trim()
  if (body.positionField !== undefined) updates.positionField = body.positionField.trim()
  if (body.syncEnabled !== undefined) updates.syncEnabled = body.syncEnabled
  if (body.nodePositions !== undefined) updates.nodePositions = body.nodePositions

  await db
    .update(flowConfigs)
    .set(updates)
    .where(eq(flowConfigs.id, flowId))

  const [updated] = await db
    .select()
    .from(flowConfigs)
    .where(eq(flowConfigs.id, flowId))
    .limit(1)

  return updated
})
