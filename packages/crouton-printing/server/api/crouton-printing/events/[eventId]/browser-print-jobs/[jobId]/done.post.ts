/**
 * Browser-print drainer callback: a ticket reached the OS / AirPrint dialog.
 * Marks the job completed via the shared generic completePrintJob (which emits
 * the `printing:job:completed` hook; domain order-completion subscribes in
 * #329). Scoped to the event + a `browser-print` station so it can only ever
 * close a browser-print job.
 *
 * Auth: none (unattended venue screen, like the KDS bump) — see the GET.
 */
import { and, eq } from 'drizzle-orm'
import { completePrintJob } from '../../../../../../utils/print-job-status'
import { printJobs, printers } from '../../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  const jobId = getRouterParam(event, 'jobId')
  if (!eventId || !jobId) {
    throw createError({ status: 400, statusText: 'eventId and jobId are required' })
  }

  const db = useDB()

  // Guard: the job must belong to this event AND a browser-print station.
  const [row] = await db
    .select({ id: printJobs.id })
    .from(printJobs)
    .innerJoin(printers, eq(printJobs.printerId, printers.id))
    .where(and(
      eq(printJobs.id, jobId),
      eq(printJobs.eventId, eventId),
      eq(printJobs.driver, 'browser-print')
    ))

  if (!row) {
    throw createError({ status: 404, statusText: 'Browser-print job not found' })
  }

  await completePrintJob(db, jobId)
  return { success: true, id: jobId }
})
