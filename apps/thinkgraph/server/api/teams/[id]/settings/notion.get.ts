/**
 * GET /api/teams/[id]/settings/notion
 *
 * Get team Notion integration settings.
 * Returns taskDatabaseId, integrationTokenHint, and statusMapping.
 * NEVER returns the raw integration token.
 * Requires team admin or owner role.
 */
import { requireTeamAdmin } from '@fyit/crouton-auth/server/utils/team'
import { useDB, eq } from '@fyit/crouton-auth/server/utils/database'
import { teamSettings } from '@fyit/crouton-auth/server/database/schema/auth'

export default defineEventHandler(async (event) => {
  const { team } = await requireTeamAdmin(event)

  const db = useDB()
  const settings = await db
    .select({ notionSettings: teamSettings.notionSettings })
    .from(teamSettings)
    .where(eq(teamSettings.teamId, team.id))
    .limit(1)

  const notion = settings[0]?.notionSettings

  if (!notion) {
    return {
      taskDatabaseId: null,
      integrationTokenHint: null,
      statusMapping: null
    }
  }

  return {
    taskDatabaseId: notion.taskDatabaseId ?? null,
    integrationTokenHint: notion.integrationTokenHint ?? null,
    statusMapping: notion.statusMapping ?? null
  }
})
