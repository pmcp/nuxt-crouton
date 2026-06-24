import { describe, it, expect } from 'vitest'
import { resolveConfigWrite } from '../server/utils/config-lww'

/**
 * WS1.C (#813) — the pure config LWW + conflict-resolution policy.
 *
 * One deterministic brain both sync directions consume:
 *  - device→cloud apply (incomingSource: 'device')  ← Leaf A (#814)
 *  - cloud→device apply (incomingSource: 'cloud')    ← Leaf B (#815)
 *
 * Rules (recorded on epic #801):
 *  - last-write-wins by per-row `updatedAt`
 *  - DEVICE WINS while the row's event is live (overrides a newer cloud write)
 *  - equal timestamps → deterministic tiebreak (device wins → both sides converge)
 *  - every overwritten / rejected write yields an audit record (no silent drop)
 *
 * No I/O — `resolveConfigWrite` is given the two rows + flags and returns the
 * decision; the callers do the DB read/write and persist `result.audit`.
 */

const t = (ms: number) => new Date(ms)

// Minimal config-row shape the policy needs; other columns are opaque to it.
const row = (over: Partial<{ id: string, updatedAt: Date }> = {}) => ({
  id: 'prod-1',
  title: 'Pils',
  updatedAt: t(1_000),
  ...over,
})

describe('resolveConfigWrite — absent local', () => {
  it('incoming wins when there is no local row (no audit — nothing overwritten)', () => {
    const r = resolveConfigWrite({
      local: null,
      incoming: row(),
      incomingSource: 'device',
      eventLive: false,
    })
    expect(r.winner).toBe('incoming')
    expect(r.reason).toBe('absent')
    expect(r.audit).toBeNull()
  })
})

describe('resolveConfigWrite — last-write-wins by updatedAt', () => {
  it('newer incoming overwrites local (both directions); audit records the loser', () => {
    for (const incomingSource of ['device', 'cloud'] as const) {
      const r = resolveConfigWrite({
        local: row({ updatedAt: t(1_000), title: 'Pils' } as any),
        incoming: row({ updatedAt: t(2_000), title: 'Pils 0.0' } as any),
        incomingSource,
        eventLive: false,
      })
      expect(r.winner).toBe('incoming')
      expect(r.reason).toBe('newer')
      // The overwritten local value is captured, not silently dropped.
      expect(r.audit).not.toBeNull()
      expect(r.audit!.entityId).toBe('prod-1')
      expect(r.audit!.winner).toBe('incoming')
      expect((r.audit!.loser as any).title).toBe('Pils')
    }
  })

  it('older incoming is rejected; the dropped write is still audited', () => {
    const r = resolveConfigWrite({
      local: row({ updatedAt: t(2_000) } as any),
      incoming: row({ updatedAt: t(1_000), title: 'stale' } as any),
      incomingSource: 'cloud',
      eventLive: false,
    })
    expect(r.winner).toBe('local')
    expect(r.reason).toBe('older')
    expect(r.audit).not.toBeNull()
    expect((r.audit!.loser as any).title).toBe('stale')
  })
})

describe('resolveConfigWrite — device-wins-while-event-live', () => {
  it('device row wins over a NEWER cloud row when the event is live (cloud→device apply)', () => {
    // Applying on the device: incoming is the cloud row, local is the device row.
    const r = resolveConfigWrite({
      local: row({ updatedAt: t(1_000) } as any), // device, older
      incoming: row({ updatedAt: t(5_000) } as any), // cloud, newer
      incomingSource: 'cloud',
      eventLive: true,
    })
    expect(r.winner).toBe('local') // the device row
    expect(r.reason).toBe('event-live-device-wins')
    expect(r.audit).not.toBeNull() // the rejected (newer) cloud write is recorded
  })

  it('device row wins on the cloud side too (device→cloud apply): a newer cloud row is overwritten', () => {
    // Applying on the cloud: incoming is the device row, local is the cloud row.
    const r = resolveConfigWrite({
      local: row({ updatedAt: t(5_000) } as any), // cloud, newer
      incoming: row({ updatedAt: t(1_000) } as any), // device, older
      incomingSource: 'device',
      eventLive: true,
    })
    expect(r.winner).toBe('incoming') // the device row
    expect(r.reason).toBe('event-live-device-wins')
    expect(r.audit).not.toBeNull()
  })
})

describe('resolveConfigWrite — deterministic tiebreak on equal updatedAt', () => {
  it('equal timestamps converge to the device row from BOTH sides', () => {
    const onCloud = resolveConfigWrite({
      local: row({ updatedAt: t(3_000) } as any), // cloud
      incoming: row({ updatedAt: t(3_000) } as any), // device
      incomingSource: 'device',
      eventLive: false,
    })
    const onDevice = resolveConfigWrite({
      local: row({ updatedAt: t(3_000) } as any), // device
      incoming: row({ updatedAt: t(3_000) } as any), // cloud
      incomingSource: 'cloud',
      eventLive: false,
    })
    expect(onCloud.reason).toBe('tie-break')
    expect(onDevice.reason).toBe('tie-break')
    // Cloud side: device is `incoming` → incoming wins. Device side: device is
    // `local` → local wins. Both keep the device row ⇒ deterministic convergence.
    expect(onCloud.winner).toBe('incoming')
    expect(onDevice.winner).toBe('local')
  })
})
