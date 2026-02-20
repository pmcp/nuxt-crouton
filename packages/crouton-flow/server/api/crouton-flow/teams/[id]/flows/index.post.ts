import { eq } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const body = await readBody(event)

  if (!body.name?.trim()) {
    throw createError({ status: 400, statusText: 'Name is required' })
  }
  if (!body.collection?.trim()) {
    throw createError({ status: 400, statusText: 'Collection is required' })
  }

  const id = crypto.randomUUID()

  await db.insert(flowConfigs).values({
    id,
    teamId: team.id,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    collection: body.collection.trim(),
    labelField: body.labelField?.trim() || 'title',
    parentField: body.parentField?.trim() || 'parentId',
    positionField: body.positionField?.trim() || 'position',
    syncEnabled: body.syncEnabled ?? false,
  })

  const [created] = await db
    .select()
    .from(flowConfigs)
    .where(eq(flowConfigs.id, id))
    .limit(1)

  return created
})
