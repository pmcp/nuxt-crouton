import { eq, and } from 'drizzle-orm'
import { atelierProjects } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const projectId = getRouterParam(event, 'projectId')

  if (!projectId) {
    throw createError({ status: 400, statusText: 'Project ID is required' })
  }

  const db = useDB()

  await db
    .delete(atelierProjects)
    .where(and(
      eq(atelierProjects.id, projectId),
      eq(atelierProjects.teamId, team.id)
    ))

  // TODO: Clean up Yjs room state for this project
  // This would need to purge the collab state from D1:
  // DELETE FROM yjs_collab_states WHERE room_id = 'atelier:{teamId}:{projectId}'

  return { success: true }
})
