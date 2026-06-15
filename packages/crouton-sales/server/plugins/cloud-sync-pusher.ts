/**
 * Cloud-sync push loop — Nitro plugin (#177, epic #175).
 *
 * On the venue Pi (a Node target), drains the `sales_sync_outbox` (#176) to the
 * cloud ingest endpoint (#178) on a poll loop. Mirrors the escpos-drainer plugin:
 * OFF by default and on every Cloudflare deploy, starting only when the Pi opts
 * in — so existing deploys are unchanged and Workers (no long-lived process,
 * outbound to itself) never run it.
 *
 *   CROUTON_SALES_CLOUD_SYNC           '1' | 'true' to enable (same flag as capture)
 *   CROUTON_SALES_CLOUD_SYNC_URL       required: the cloud ingest endpoint URL
 *   NUXT_CROUTON_SALES_CLOUD_SYNC_SECRET  shared secret (x-sync-key)
 *   CROUTON_SALES_CLOUD_SYNC_POLL_MS   base poll interval (default 3000)
 *   CROUTON_SALES_CLOUD_SYNC_BATCH     rows per batch (default 100)
 *
 * Online-only: when the push fails (offline / endpoint down) it backs off
 * exponentially (capped) and resumes on reconnect; a full batch drains again
 * immediately so a burst empties within seconds. Self-chained setTimeout (not
 * setInterval) means ticks never overlap.
 */
import { pushPendingOutbox } from '../utils/cloud-sync-pusher'

const MAX_BACKOFF_MS = 60000

export default defineNitroPlugin(() => {
  const flag = process.env.CROUTON_SALES_CLOUD_SYNC
  if (flag !== '1' && flag !== 'true') return

  const url = process.env.CROUTON_SALES_CLOUD_SYNC_URL
  if (!url) {
    console.warn('🍞 crouton:sales cloud sync ON but CROUTON_SALES_CLOUD_SYNC_URL unset — pusher idle')
    return
  }

  const basePollMs = Number(process.env.CROUTON_SALES_CLOUD_SYNC_POLL_MS) || 3000
  const batchSize = Number(process.env.CROUTON_SALES_CLOUD_SYNC_BATCH) || 100

  let backoff = 0
  const schedule = (ms: number) => setTimeout(tick, ms)

  const tick = async () => {
    try {
      const res = await pushPendingOutbox(useDB(), { url, batchSize })
      backoff = 0 // success clears any backoff
      // Drain bursts fast: a full batch likely means more is pending.
      schedule(res.claimed >= batchSize ? 50 : basePollMs)
    }
    catch (err) {
      backoff = backoff ? Math.min(backoff * 2, MAX_BACKOFF_MS) : basePollMs
      console.error(`[crouton-sales] cloud sync push failed (retry in ${backoff}ms):`, (err as { message?: string })?.message || err)
      schedule(backoff)
    }
  }

  console.log(`🍞 crouton:sales cloud sync pusher ON (poll ${basePollMs}ms → ${url})`)
  schedule(basePollMs)
})
