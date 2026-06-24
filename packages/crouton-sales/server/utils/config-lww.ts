/**
 * @crouton-package crouton-sales
 * @description Config last-write-wins + conflict-resolution policy (WS1.C, #813,
 * epic #801 — bidirectional config sync).
 *
 * The single **pure** brain both sync directions consume:
 *   - device→cloud apply (`incomingSource: 'device'`) — the cloud ingest (#814)
 *   - cloud→device apply (`incomingSource: 'cloud'`)   — the device pull (#815)
 *
 * Given the row currently in the target store (`local`, possibly absent) and the
 * row arriving from the other side (`incoming`), it decides who wins:
 *   - **last-write-wins** by per-row `updatedAt` (every config table already
 *     stamps `updatedAt.$onUpdate`)
 *   - **device wins while the row's event is live** — overrides a newer cloud
 *     write, because the till is authoritative during service
 *   - **equal `updatedAt` → device wins** the tiebreak, so BOTH machines (each
 *     running this same function) converge on the device's row instead of
 *     permanently disagreeing
 *
 * It performs no I/O: callers read `local`, apply the winner, and persist
 * `result.audit` whenever it is non-null. An audit record is emitted for every
 * discarded write — overwrite OR rejection — so a losing config edit is never
 * silently dropped (the epic's hard requirement; surfaced by Leaf D #816).
 */

/** The columns the policy needs; every other column is opaque and carried through. */
export interface ConfigRow {
  id: string
  /** Per-row write clock. A `Date` (timestamp-mode column) or epoch ms. */
  updatedAt: Date | number
  [key: string]: unknown
}

/** Which side produced `incoming` — i.e. which machine is applying the write. */
export type SyncSource = 'device' | 'cloud'

export interface ResolveInput {
  /** The row currently in the target store, or null when absent. */
  local: ConfigRow | null
  /** The row arriving from the other side. */
  incoming: ConfigRow
  /** Who sent `incoming`: 'device' on the cloud ingest, 'cloud' on the device pull. */
  incomingSource: SyncSource
  /** Is the row's event currently live? Device wins outright while true. */
  eventLive: boolean
}

export type ResolveReason =
  | 'absent' // no local row — incoming adopted, nothing overwritten
  | 'newer' // incoming.updatedAt > local.updatedAt
  | 'older' // incoming.updatedAt < local.updatedAt — rejected
  | 'tie-break' // equal updatedAt — device wins the tiebreak
  | 'event-live-device-wins' // event live — device row wins regardless of clocks

/** A discarded write, recorded so it is never silently lost (persisted by Leaf D). */
export interface ConfigAuditRecord {
  entityId: string
  winner: 'local' | 'incoming'
  reason: ResolveReason
  /** The full value that lost — the device-or-cloud row that was discarded. */
  loser: ConfigRow
  /** Which side the losing row came from, for the human reading the trail. */
  loserSource: SyncSource
}

export interface ResolveResult {
  winner: 'local' | 'incoming'
  reason: ResolveReason
  /** Non-null whenever a write was overwritten or rejected. */
  audit: ConfigAuditRecord | null
}

function ms(at: Date | number): number {
  return at instanceof Date ? at.getTime() : Number(at)
}

/**
 * The side `incoming` came from is `incomingSource`; the opposite side produced
 * `local`. Used to know which row is "the device's" for the device-wins rules.
 */
function localSource(incomingSource: SyncSource): SyncSource {
  return incomingSource === 'device' ? 'cloud' : 'device'
}

export function resolveConfigWrite(input: ResolveInput): ResolveResult {
  const { local, incoming, incomingSource, eventLive } = input

  // No local row → adopt incoming; nothing is overwritten, so no audit.
  if (local == null) {
    return { winner: 'incoming', reason: 'absent', audit: null }
  }

  const incomingIsDevice = incomingSource === 'device'
  const localIsDevice = localSource(incomingSource) === 'device'

  // Build the result + an audit record for the discarded side.
  const decide = (winner: 'local' | 'incoming', reason: ResolveReason): ResolveResult => {
    const loser = winner === 'incoming' ? local : incoming
    const loserSource = winner === 'incoming' ? localSource(incomingSource) : incomingSource
    return {
      winner,
      reason,
      audit: { entityId: incoming.id, winner, reason, loser, loserSource },
    }
  }

  // Event live → the device row wins outright, whichever side is applying.
  if (eventLive) {
    const winner = incomingIsDevice ? 'incoming' : 'local'
    return decide(winner, 'event-live-device-wins')
  }

  const a = ms(incoming.updatedAt)
  const b = ms(local.updatedAt)

  if (a > b) return decide('incoming', 'newer')
  if (a < b) return decide('local', 'older')

  // Tie → the device row wins so both machines converge on it.
  return decide(localIsDevice ? 'local' : 'incoming', 'tie-break')
}
