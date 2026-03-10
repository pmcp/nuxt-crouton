/**
 * Lightweight team slug validation endpoint for route guards.
 * Returns { valid: true } if a team with the given slug exists.
 * No auth required — only checks existence, exposes no data.
 */
import { organization } from '@fyit/crouton-auth/server/database/schema/auth'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    return { valid: false }
  }

  const db = useDB()

  const [team] = await db
    .select({ id: organization.id })
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1)

  return { valid: !!team }
})
