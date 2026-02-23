import { eq, like, and, ne } from 'drizzle-orm'
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

/**
 * Server-side URL-safe slug transformation.
 * Mirrors the client-side slugify in app/utils/slugify.ts.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Find a unique slug within a team by appending -1, -2, etc. if the base slug is taken.
 * Single query approach: fetches all matching slugs and calculates next suffix in JS.
 *
 * @param db - Drizzle database instance (pass `useDB()` from the caller)
 */
export async function findUniqueSlug(
  db: any,
  table: SQLiteTableWithColumns<any>,
  slugColumn: any,
  teamIdColumn: any,
  baseSlug: string,
  teamId: string,
  excludeId?: string
): Promise<string> {
  const conditions = [
    eq(teamIdColumn, teamId),
    like(slugColumn, `${baseSlug}%`)
  ]

  if (excludeId) {
    conditions.push(ne(table.id, excludeId))
  }

  const existing = await (db as any)
    .select({ slug: slugColumn })
    .from(table)
    .where(and(...conditions))

  const existingSlugs = new Set(existing.map((r: any) => r.slug))

  // If base slug is available, use it
  if (!existingSlugs.has(baseSlug)) {
    return baseSlug
  }

  // Find next available suffix
  let suffix = 1
  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix++
  }

  return `${baseSlug}-${suffix}`
}
