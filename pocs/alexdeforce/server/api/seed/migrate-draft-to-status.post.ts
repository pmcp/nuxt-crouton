/**
 * One-time data migration: converts draft (boolean) → status (string)
 *
 * Run once after applying the schema migration:
 *   curl -X POST http://localhost:3000/api/seed/migrate-draft-to-status
 *
 * Safe to run multiple times — skips rows that already have a status value.
 * Delete this file after migration is complete.
 */
export default defineEventHandler(async () => {
  const db = useDB()

  // Migrate content_articles: draft=1 → 'draft', draft=0/NULL → 'published'
  const articlesResult = await db.run(
    `UPDATE content_articles
     SET status = CASE WHEN draft = 1 THEN 'draft' ELSE 'published' END,
         publishedAt = CASE WHEN draft = 0 OR draft IS NULL THEN createdAt ELSE NULL END
     WHERE status IS NULL OR status = ''`
  )

  // Migrate content_agendas: draft=1 → 'draft', draft=0/NULL → 'published'
  const agendasResult = await db.run(
    `UPDATE content_agendas
     SET status = CASE WHEN draft = 1 THEN 'draft' ELSE 'published' END,
         publishedAt = CASE WHEN draft = 0 OR draft IS NULL THEN createdAt ELSE NULL END
     WHERE status IS NULL OR status = ''`
  )

  return {
    success: true,
    articlesUpdated: articlesResult.changes,
    agendasUpdated: agendasResult.changes,
  }
})
