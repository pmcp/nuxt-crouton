/**
 * Browser-print drainer callback: a ticket could not be printed (payload
 * unrenderable, operator reported a failure). Marks the job failed and flags
 * the order `print_failed` (shared lifecycle via `failPrintJob`). Scoped to the
 * event + a `browser-print` station.
 *
 * Auth: none (unattended venue screen) — see the GET.
 */
import { and, eq } from 'drizzle-orm'
// Shared queue lifecycle stays in crouton-sales; imported via the package export.
import { failPrintJob } from '@fyit/crouton-sales/server/utils/print-job-complete'
import { salesPrintqueues } from '~~/layers/sales/collections/printqueues/server/database/schema'
import { salesPrinters } from '~~/layers/sales/collections/printers/server/database/schema'

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
    .select({ id: salesPrintqueues.id })
    .from(salesPrintqueues)
    .innerJoin(salesPrinters, eq(salesPrintqueues.printerId, salesPrinters.id))
    .where(and(
      eq(salesPrintqueues.id, jobId),
      eq(salesPrintqueues.eventId, eventId),
      eq(salesPrinters.driver, 'browser-print')
    ))

  if (!row) {
    throw createError({ status: 404, statusText: 'Browser-print job not found' })
  }

  await failPrintJob(db, jobId, errorMessage)
  return { success: true, id: jobId, errorMessage }
})
