import { describe, it, expect } from 'vitest'
import { enqueuePrintJob, enqueuePrintJobs, PRINT_STATUS } from '../server/utils/print-job-queue'

// Minimal fake drizzle db: captures the values handed to insert().values().
function fakeDb() {
  const inserted: any[] = []
  return {
    inserted,
    insert: () => ({
      values: async (v: any) => { inserted.push(...(Array.isArray(v) ? v : [v])) }
    })
  }
}

describe('enqueuePrintJob', () => {
  it('inserts one pending job with sensible defaults and returns its id', async () => {
    const db = fakeDb()
    const id = await enqueuePrintJob(db, {
      source: 'bookings',
      printerId: 'p1',
      payload: 'BASE64',
      refType: 'booking',
      refId: 'b1',
      eventId: 'e1',
      teamId: 't1'
    })

    expect(id).toBeTruthy()
    expect(db.inserted).toHaveLength(1)
    const row = db.inserted[0]
    expect(row.id).toBe(id)
    expect(row).toMatchObject({
      source: 'bookings',
      printerId: 'p1',
      payload: 'BASE64',
      refType: 'booking',
      refId: 'b1',
      eventId: 'e1',
      teamId: 't1',
      driver: 'network-escpos',        // default
      status: PRINT_STATUS.PENDING,    // '0'
      printMode: 'normal',             // default
      retryCount: '0'
    })
  })

  it('honours an explicit driver and coalesces missing optionals to null', async () => {
    const db = fakeDb()
    await enqueuePrintJob(db, { source: 'sales', printerId: 'p2', payload: '{}', driver: 'browser-print' })
    const row = db.inserted[0]
    expect(row.driver).toBe('browser-print')
    expect(row.refType).toBeNull()
    expect(row.refId).toBeNull()
    expect(row.locationId).toBeNull()
  })

  it('enqueuePrintJobs inserts many and returns ids in order', async () => {
    const db = fakeDb()
    const ids = await enqueuePrintJobs(db, [
      { source: 'sales', printerId: 'p1', payload: 'a' },
      { source: 'sales', printerId: 'p2', payload: 'b' }
    ])
    expect(ids).toHaveLength(2)
    expect(db.inserted.map(r => r.id)).toEqual(ids)
    expect(db.inserted.map(r => r.payload)).toEqual(['a', 'b'])
  })

  it('enqueuePrintJobs is a no-op for an empty list', async () => {
    const db = fakeDb()
    expect(await enqueuePrintJobs(db, [])).toEqual([])
    expect(db.inserted).toHaveLength(0)
  })
})
