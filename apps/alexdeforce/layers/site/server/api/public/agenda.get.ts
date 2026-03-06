import { useDrizzle } from '#server/utils/drizzle'
import { contentAgendas } from '~~/server/db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDrizzle()

  const events = await db
    .select()
    .from(contentAgendas)
    .where(eq(contentAgendas.draft, false))
    .orderBy(desc(contentAgendas.date))

  return events
})
