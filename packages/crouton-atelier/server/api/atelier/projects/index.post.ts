import { atelierProjects } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { teamId, userId } = await resolveTeamAndCheckMembership(event)
  const body = await readBody<{ name: string, description?: string }>(event)

  if (!body.name?.trim()) {
    throw createError({ status: 400, statusText: 'Name is required' })
  }

  const db = useDrizzle()

  const [project] = await db
    .insert(atelierProjects)
    .values({
      teamId,
      owner: userId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      createdBy: userId,
      updatedBy: userId
    })
    .returning()

  return project
})
