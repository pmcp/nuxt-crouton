/**
 * In-process ESC/POS print drainer — Nitro plugin (epic #61; #328).
 *
 * On a Node target ON the venue LAN, the app can drive thermal printers
 * directly over TCP `:9100` instead of relying on the external RUT956 shell
 * spooler. This plugin runs that drainer on a poll loop, over the generic
 * `print_jobs` lifecycle (see `escpos-drainer.ts`).
 *
 * OFF by default and on every Cloudflare deploy: it only starts when the enable
 * flag is set (the venue Pi sets it), so existing deploys are unchanged and
 * Workers (no raw sockets, no long-lived process) never run it. `node:net` is
 * imported lazily by the drainer, so even loading this plugin is import-safe.
 *
 *   CROUTON_PRINTING_DRAINER           '1' | 'true' to enable
 *     (CROUTON_SALES_PRINT_DRAINER also honoured for back-compat during migration)
 *   CROUTON_PRINTING_DRAINER_EVENT     optional: only drain this event
 *   CROUTON_PRINTING_DRAINER_POLL_MS   poll interval (default 2000)
 *
 * Run EITHER this OR the HTTP spooler for a given printer set, never both.
 */
import { drainPendingEscposJobs } from '../utils/escpos-drainer'

export default defineNitroPlugin(() => {
  const flag = process.env.CROUTON_PRINTING_DRAINER || process.env.CROUTON_SALES_PRINT_DRAINER
  if (flag !== '1' && flag !== 'true') return

  const eventId = process.env.CROUTON_PRINTING_DRAINER_EVENT
    || process.env.CROUTON_SALES_PRINT_DRAINER_EVENT
    || undefined
  const pollMs = Number(process.env.CROUTON_PRINTING_DRAINER_POLL_MS || process.env.CROUTON_SALES_PRINT_DRAINER_POLL_MS) || 2000

  // Skip overlapping ticks: a slow print run (a jammed printer holds the socket
  // open for the full drain window) must not stack up behind itself.
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      await drainPendingEscposJobs(useDB(), { eventId })
    }
    catch (err) {
      console.error('[crouton-printing] ESC/POS drainer tick failed:', err)
    }
    finally {
      running = false
    }
  }

  console.log(`🍞 crouton:printing in-process ESC/POS drainer ON (poll ${pollMs}ms${eventId ? `, event ${eventId}` : ', all events'})`)
  setInterval(tick, pollMs)
})
