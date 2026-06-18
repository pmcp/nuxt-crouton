/**
 * Spooler-callback: mark a print job as failed and bump retry count.
 *
 * Generic — updates only print_jobs (via failPrintJob, which emits the
 * `printing:job:failed` lifecycle hook). Domain reactions (e.g. flag the order
 * print_failed) subscribe to that hook (#329); this endpoint stays
 * domain-agnostic.
 */
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { failPrintJob } from '../../../../utils/print-job-status'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Job ID is required' })
  }

  const body = await readBody<{ errorMessage?: string }>(event).catch(() => null)
  const errorMessage = body?.errorMessage || 'Print job failed'

  const outcome = await failPrintJob(useDB(), jobId, errorMessage)
  if (!outcome) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  return { success: true, id: jobId, errorMessage }
})
