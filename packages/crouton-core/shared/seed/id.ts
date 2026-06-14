/**
 * Stable, deterministic ids for seed rows.
 *
 * Every seeded row gets a predictable id derived from a namespace + parts, so
 * a second `db:seed` run targets the *same* row (upsert) instead of inserting
 * a duplicate. Ids are plain text — every seeded table uses a `text` primary
 * key — and are intentionally human-readable (`seed:event:test1:vlaamsekermis`)
 * so they're obvious in the DB and never collide with app-generated nanoids.
 */

/** Join parts into a stable, slug-safe seed id under the `seed:` namespace. */
export function seedId(...parts: Array<string | number>): string {
  return [
    'seed',
    ...parts.map(p =>
      String(p)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    )
  ].join(':')
}

/** The stable organization (team) id for a given team slug. */
export function seedOrgId(slug: string): string {
  return seedId('org', slug)
}
