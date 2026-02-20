import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { croutonEvents } from '../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const query = getQuery(event)
  const collectionName = query.collectionName as string | undefined
  const operation = query.operation as 'create' | 'update' | 'delete' | undefined
  const userId = query.userId as string | undefined
  const dateFrom = query.dateFrom ? new Date(String(query.dateFrom)) : undefined
  const dateTo = query.dateTo ? new Date(String(query.dateTo)) : undefined
  const page = query.page ? Number.parseInt(String(query.page), 10) : 1
  const pageSize = query.pageSize ? Number.parseInt(String(query.pageSize), 10) : 50

  const conditions = [eq(croutonEvents.teamId, team.id)]

  if (collectionName) {
    conditions.push(eq(croutonEvents.collectionName, collectionName))
  }
  if (operation) {
    conditions.push(eq(croutonEvents.operation, operation))
  }
  if (userId) {
    conditions.push(eq(croutonEvents.userId, userId))
  }
  if (dateFrom && !isNaN(dateFrom.getTime())) {
    conditions.push(gte(croutonEvents.timestamp, dateFrom))
  }
  if (dateTo && !isNaN(dateTo.getTime())) {
    conditions.push(lte(croutonEvents.timestamp, dateTo))
  }

  const offset = (page - 1) * pageSize

  const events = await db
    .select()
    .from(croutonEvents)
    .where(and(...conditions))
    .orderBy(desc(croutonEvents.timestamp))
    .limit(pageSize)
    .offset(offset)

  return events
})
