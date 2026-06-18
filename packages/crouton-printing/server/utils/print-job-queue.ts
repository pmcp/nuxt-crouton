/**
 * @crouton-package crouton-printing
 * @description Generic print-job queue API (epic #325, issue #326).
 *
 * The one entry point every domain uses to print: render your ticket to an
 * opaque payload, then `enqueuePrintJob()` it. The engine (#327) encodes the
 * payload; the transport (#328) drains and delivers it; lifecycle hooks (#329)
 * report completion back to the domain. This module knows nothing about orders
 * or bookings — the domain is carried by `source` + `refType`/`refId`.
 *
 * The drizzle db is passed in by the caller (same pattern as crouton-sales'
 * recordOutboxEvents) so this package stays decoupled from any one db-access
 * util. The schema is imported lazily, keeping the module import-safe and cheap
 * everywhere (including the edge).
 */
import { nanoid } from 'nanoid'

/**
 * Print-job status codes. Text to match the on-site spooler contract
 * (the RUT956 script and the HTTP spooler endpoints read string status values).
 */
export const PRINT_STATUS = {
  PENDING: '0',
  PRINTING: '1',
  COMPLETED: '2',
  FAILED: '9'
} as const

export type PrintStatusCode = typeof PRINT_STATUS[keyof typeof PRINT_STATUS]

/** Output drivers known to the engine + transport. */
export type PrintDriver = 'network-escpos' | 'browser-print' | (string & {})

export interface EnqueuePrintJobInput {
  /** Domain that produced the job ('sales' | 'bookings' | …). */
  source: string
  /** Target printer row id. */
  printerId: string
  /** Opaque encoded ticket (base64 ESC/POS for thermal, JSON for browser-print). */
  payload: string
  /** Output driver; defaults to the printer's network-escpos path. */
  driver?: PrintDriver
  locationId?: string | null
  teamId?: string | null
  eventId?: string | null
  /** Opaque back-reference to the domain entity, e.g. 'order' / 'booking'. */
  refType?: string | null
  refId?: string | null
  printMode?: string
  /** Override the initial status (defaults to PENDING). */
  status?: PrintStatusCode
}

/**
 * Insert one pending print job and return its id. The transport picks it up
 * on its next drain. Throws on a real DB error — unlike the sales sync outbox,
 * a failed enqueue means the ticket would silently never print, so the caller
 * decides how to handle it.
 */
export async function enqueuePrintJob(db: any, input: EnqueuePrintJobInput): Promise<string> {
  const { printJobs } = await import('../database/schema')
  const id = nanoid()
  await db.insert(printJobs).values({
    id,
    source: input.source,
    printerId: input.printerId,
    locationId: input.locationId ?? null,
    teamId: input.teamId ?? null,
    eventId: input.eventId ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    driver: input.driver ?? 'network-escpos',
    status: input.status ?? PRINT_STATUS.PENDING,
    payload: input.payload,
    printMode: input.printMode ?? 'normal',
    retryCount: '0'
  })
  return id
}

/**
 * Insert many jobs in one go (e.g. per-location kitchen tickets + a receipt for
 * a single order). Returns the inserted ids in input order.
 */
export async function enqueuePrintJobs(db: any, inputs: EnqueuePrintJobInput[]): Promise<string[]> {
  if (inputs.length === 0) return []
  const { printJobs } = await import('../database/schema')
  const rows = inputs.map(input => ({
    id: nanoid(),
    source: input.source,
    printerId: input.printerId,
    locationId: input.locationId ?? null,
    teamId: input.teamId ?? null,
    eventId: input.eventId ?? null,
    refType: input.refType ?? null,
    refId: input.refId ?? null,
    driver: input.driver ?? 'network-escpos',
    status: input.status ?? PRINT_STATUS.PENDING,
    payload: input.payload,
    printMode: input.printMode ?? 'normal',
    retryCount: '0'
  }))
  await db.insert(printJobs).values(rows)
  return rows.map(r => r.id)
}
