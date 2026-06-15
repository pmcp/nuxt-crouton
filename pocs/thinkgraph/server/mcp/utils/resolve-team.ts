import { eq, or } from 'drizzle-orm'
import { organization } from '~~/server/db/schema'

/**
 * Resolve a team slug or ID to the actual team UUID.
 * MCP tools receive slugs from the URL (e.g., "test1") but the DB stores UUIDs.
 */
export async function resolveTeamId(teamIdOrSlug: string): Promise<string> {
  const db = useDB()

  const [row] = await (db as any)
    .select({ id: organization.id })
    .from(organization)
    .where(
      or(
        eq(organization.id, teamIdOrSlug),
        eq(organization.slug, teamIdOrSlug),
      )
    )
    .limit(1)

  if (!row) {
    throw new Error(`Team "${teamIdOrSlug}" not found`)
  }

  return row.id
}
