import { eq, and } from 'drizzle-orm'
import { atelierProjects } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { teamId } = await resolveTeamAndCheckMembership(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ status: 400, statusText: 'Project ID is required' })
  }

  const db = useDrizzle()

  await db
    .delete(atelierProjects)
    .where(and(
      eq(atelierProjects.id, id),
      eq(atelierProjects.teamId, teamId)
    ))

  // TODO: Clean up Yjs room state for this project
  // This would need to purge the collab state from D1:
  // DELETE FROM yjs_collab_states WHERE room_id = 'atelier:{teamId}:{projectId}'

  return { success: true }
})
