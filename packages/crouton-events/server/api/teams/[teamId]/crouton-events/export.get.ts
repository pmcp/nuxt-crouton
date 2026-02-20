/**
 * Export events endpoint for audit log compliance
 *
 * Supports:
 * - Format: ?format=csv|json (default: json)
 * - Filters: ?collectionName=X&operation=X&userId=X&dateFrom=X&dateTo=X
 *
 * Response:
 * - CSV: Returns text/csv with headers
 * - JSON: Returns array of events
 */
import { eq, and, gte, lte } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { croutonEvents } from '../../../../database/schema'

export default defineEventHandler(async (event) => {
  // Authenticate and check team membership
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  // Parse query parameters
  const query = getQuery(event)
  const format = (query.format as 'csv' | 'json') || 'json'
  const collectionName = query.collectionName as string | undefined
  const operation = query.operation as 'create' | 'update' | 'delete' | undefined
  const userId = query.userId as string | undefined
  const dateFrom = query.dateFrom ? new Date(String(query.dateFrom)) : undefined
  const dateTo = query.dateTo ? new Date(String(query.dateTo)) : undefined

  // Build where conditions
  const conditions = [
    eq(croutonEvents.teamId, team.id)
  ]

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

  // Query events
  const events = await db
    .select()
    .from(croutonEvents)
    .where(and(...conditions))
    .orderBy(croutonEvents.timestamp)
    .limit(500)

  // Return based on format
  if (format === 'csv') {
    // Generate CSV
    const headers = [
      'timestamp',
      'operation',
      'collectionName',
      'itemId',
      'userId',
      'userName',
      'changes',
      'metadata'
    ]

    const rows = events.map((e: any) => [
      new Date(e.timestamp).toISOString(),
      e.operation,
      e.collectionName,
      e.itemId,
      e.userId,
      e.userName || '',
      JSON.stringify(e.changes || []),
      JSON.stringify(e.metadata || {})
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    setHeader(event, 'Content-Type', 'text/csv')
    setHeader(event, 'Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`)

    return csvContent
  }

  // Default: JSON format
  return events
})
