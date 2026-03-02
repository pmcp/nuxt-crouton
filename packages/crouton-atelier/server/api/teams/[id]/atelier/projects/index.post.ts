import { atelierProjects } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const body = await readBody<{ name: string, description?: string }>(event)

  if (!body.name?.trim()) {
    throw createError({ status: 400, statusText: 'Name is required' })
  }

  const db = useDB()

  const [project] = await db
    .insert(atelierProjects)
    .values({
      teamId: team.id,
      owner: user.id,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      createdBy: user.id,
      updatedBy: user.id
    })
    .returning()

  return project
})
