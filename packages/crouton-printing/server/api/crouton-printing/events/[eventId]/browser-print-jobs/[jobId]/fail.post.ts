/**
 * Browser-print drainer callback: a ticket could not be printed (payload
 * unrenderable, operator reported a failure). Marks the job failed via the
 * shared generic failPrintJob (which emits `printing:job:failed`; domain
 * reactions subscribe in #329). Scoped to the event + a `browser-print` station.
 *
 * Auth: none (unattended venue screen) — see the GET.
 */
import { and, eq } from 'drizzle-orm'
import { failPrintJob } from '../../../../../../utils/print-job-status'
import { printJobs, printers } from '../../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const eventId = getRouterParam(event, 'eventId')
  const jobId = getRouterParam(event, 'jobId')
  if (!eventId || !jobId) {
    throw createError({ status: 400, statusText: 'eventId and jobId are required' })
  }

  const body = await readBody<{ errorMessage?: string }>(event).catch(() => null)
  const errorMessage = body?.errorMessage || 'Browser print failed'

  const db = useDB()

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

  await failPrintJob(db, jobId, errorMessage)
  return { success: true, id: jobId, errorMessage }
})
