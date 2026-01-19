/**
 * GET /api/teams/[id]/domains
 *
 * List all custom domains for a team/organization.
 * Requires team owner role.
 */
import { requireTeamOwner } from '../../../../utils/team'
import { useDB, tables, eq } from '../../../../utils/database'

export default defineEventHandler(async (event) => {
  const { team } = await requireTeamOwner(event)

  const db = useDB()
  const domains = await db
    .select()
    .from(tables.domain)
    .where(eq(tables.domain.organizationId, team.id))

  return domains
})
