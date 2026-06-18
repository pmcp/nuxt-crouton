/**
 * Spooler-callback: mark a print job as successfully completed.
 *
 * Generic — updates only print_jobs (via completePrintJob, which emits the
 * `printing:job:completed` lifecycle hook). Domain reactions (e.g. sales order
 * auto-complete) subscribe to that hook (#329); this endpoint stays
 * domain-agnostic.
 */
import { requirePrintServerKey } from '../../../../utils/print-server-auth'
import { completePrintJob } from '../../../../utils/print-job-status'

export default defineEventHandler(async (event) => {
  requirePrintServerKey(event)

  const jobId = getRouterParam(event, 'jobId')
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Job ID is required' })
  }

  const outcome = await completePrintJob(useDB(), jobId)
  if (!outcome) {
    throw createError({ status: 404, statusText: 'Print job not found' })
  }

  return { success: true, id: jobId }
})
