/**
 * @crouton-package crouton-printing
 * @description Generic print-job lifecycle transitions (epic #325, #328).
 *
 * `completePrintJob` / `failPrintJob` are the single place a job moves to a
 * terminal state, shared by every transport path (in-process drainer, HTTP
 * spooler, browser-print drainer). They update ONLY the generic `print_jobs`
 * table — they know nothing about orders or bookings. Domain reactions (e.g.
 * sales auto-completing an order when all its tickets printed) hang off the
 * lifecycle hooks emitted here, wired in #329; the domain subscribes, this
 * package never imports the domain.
 *
 * `db` is passed by the caller (same decoupling as enqueuePrintJob). Schema is
 * imported lazily so the module stays import-safe everywhere.
 */
import { eq, sql } from 'drizzle-orm'
import { PRINT_STATUS } from './print-job-queue'

/** The terminal-transition context handed to lifecycle subscribers (#329). */
export interface PrintJobOutcome {
  id: string
  source: string
  refType: string | null
  refId: string | null
  teamId: string | null
  eventId: string | null
  status: typeof PRINT_STATUS.COMPLETED | typeof PRINT_STATUS.FAILED
  errorMessage?: string
}

async function emitLifecycle(event: 'completed' | 'failed', db: any, outcome: PrintJobOutcome): Promise<void> {
  // Domain subscribers (e.g. sales order auto-complete + cloud-sync mirror) hang
  // off these Nitro hooks (#329). `db` is passed through the hook so the
  // subscriber reuses the same connection rather than depending on useDB()
  // request context. Emitting is best-effort — a missing/erroring subscriber
  // must never fail the print transition. crouton-printing never imports a domain.
  try {
    const { useNitroApp } = await import('nitropack/runtime')
    await (useNitroApp() as any).hooks.callHook(`printing:job:${event}`, { db, ...outcome })
  }
  catch {
    /* no nitro app / no subscriber — fine */
  }
}

/** Mark a job completed (status 2). Returns the outcome handed to subscribers. */
export async function completePrintJob(db: any, jobId: string): Promise<PrintJobOutcome | null> {
  const { printJobs } = await import('../database/schema')
  const now = new Date()
  // completedAt is a text column (ISO string) — the spooler/D1-safe contract.
  const result = await db
    .update(printJobs)
    .set({ status: PRINT_STATUS.COMPLETED, completedAt: now.toISOString(), updatedAt: now })
    .where(eq(printJobs.id, jobId))
    .returning({
      id: printJobs.id,
      source: printJobs.source,
      refType: printJobs.refType,
      refId: printJobs.refId,
      teamId: printJobs.teamId,
      eventId: printJobs.eventId
    })

  if (result.length === 0) return null
  const outcome: PrintJobOutcome = { ...result[0], status: PRINT_STATUS.COMPLETED }
  await emitLifecycle('completed', db, outcome)
  return outcome
}

/** Mark a job failed (status 9), bumping retryCount. Returns the outcome. */
export async function failPrintJob(db: any, jobId: string, errorMessage = 'Print job failed'): Promise<PrintJobOutcome | null> {
  const { printJobs } = await import('../database/schema')
  // retryCount is text storing a number — increment via COALESCE+CAST.
  const result = await db
    .update(printJobs)
    .set({
      status: PRINT_STATUS.FAILED,
      errorMessage,
      retryCount: sql`CAST(COALESCE(${printJobs.retryCount}, '0') AS INTEGER) + 1`,
      updatedAt: new Date()
    })
    .where(eq(printJobs.id, jobId))
    .returning({
      id: printJobs.id,
      source: printJobs.source,
      refType: printJobs.refType,
      refId: printJobs.refId,
      teamId: printJobs.teamId,
      eventId: printJobs.eventId
    })

  if (result.length === 0) return null
  const outcome: PrintJobOutcome = { ...result[0], status: PRINT_STATUS.FAILED, errorMessage }
  await emitLifecycle('failed', db, outcome)
  return outcome
}
