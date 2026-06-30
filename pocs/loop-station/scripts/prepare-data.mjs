#!/usr/bin/env node
/**
 * Data seam for the Loop Station view (WS3, #931).
 *
 * The app ONLY renders — all compute lives in the WS1/WS2 scripts. This step
 * stages their output into public/data/ for the app to fetch:
 *
 *   - history.jsonl  ← the committed WS1 inventory (writeups/loop-station/)
 *   - trace.jsonl    ← WS2, by ACTIVE HARNESS (#944, toggle parity):
 *                       • AGENT_HARNESS=pi → pi telemetry (live PI_TELEMETRY_DIR of
 *                         subagent metas, else the committed real pi sample) via the
 *                         pi-telemetry.mjs adapter.
 *                       • default (claude) → reconstructed from local Claude Code
 *                         transcripts via parse-transcripts.mjs.
 *                       • either way, falls back to the committed example trace.
 *
 * Runs before dev/build. Defensive: a missing source degrades to an empty/example
 * file rather than failing the build. No deps.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const POC = path.join(HERE, '..')
const REPO = path.join(POC, '..', '..')
const OUT = path.join(POC, 'public', 'data')
fs.mkdirSync(OUT, { recursive: true })

// ── history.jsonl (WS1) ───────────────────────────────────────────────────────
const historySrc = path.join(REPO, 'writeups', 'loop-station', 'history.jsonl')
if (fs.existsSync(historySrc)) {
  fs.copyFileSync(historySrc, path.join(OUT, 'history.jsonl'))
  console.error('[prepare-data] history.jsonl ← writeups/loop-station/history.jsonl')
} else {
  fs.writeFileSync(path.join(OUT, 'history.jsonl'), '')
  console.error('[prepare-data] history.jsonl: source missing → empty')
}

// ── trace.jsonl (WS2) ─────────────────────────────────────────────────────────
async function buildTrace() {
  const harness = (process.env.AGENT_HARNESS || 'claude').toLowerCase()
  const writeTrace = (meta, events, label) => {
    const lines = [JSON.stringify(meta), ...events.map((e) => JSON.stringify(e))]
    fs.writeFileSync(path.join(OUT, 'trace.jsonl'), lines.join('\n') + '\n')
    console.error(`[prepare-data] trace.jsonl ← ${label} (${events.length} events)`)
  }

  if (harness === 'pi') {
    // Active harness is pi → pi telemetry: a live PI_TELEMETRY_DIR of subagent metas, else
    // the committed real sample (so a pi build still renders pi-shaped data). #944.
    try {
      const { buildPiTrace } = await import(
        path.join(REPO, '.claude', 'skills', 'loop-station', 'pi-telemetry.mjs')
      )
      const liveDir = process.env.PI_TELEMETRY_DIR
      const trace =
        (liveDir && buildPiTrace(liveDir)) ||
        buildPiTrace(path.join(POC, 'data', 'pi-telemetry-sample'))
      if (trace && trace.events.length > 0) {
        writeTrace(trace.meta, trace.events, liveDir ? `pi telemetry ${liveDir}` : 'committed pi sample')
        return
      }
    } catch (err) {
      console.error(`[prepare-data] pi telemetry unavailable (${err.message}); using example`)
    }
  } else {
    // Default (claude harness): reconstruct from whatever Claude Code transcripts exist here.
    try {
      const mod = await import(
        path.join(REPO, '.claude', 'skills', 'loop-station', 'parse-transcripts.mjs')
      )
      const result = mod.parseSession({})
      if (result.events && result.events.length > 0) {
        writeTrace(
          { kind: 'meta', source: 'live', session: result.session, layout: result.layout, eventCount: result.events.length },
          result.events,
          `live session ${result.session}`
        )
        return
      }
    } catch (err) {
      console.error(`[prepare-data] live parse unavailable (${err.message}); using example`)
    }
  }
  // Shared fallback: the committed real example (so the deployed build always has a graph).
  const example = path.join(POC, 'data', 'example-trace.jsonl')
  if (fs.existsSync(example)) {
    fs.copyFileSync(example, path.join(OUT, 'trace.jsonl'))
    console.error('[prepare-data] trace.jsonl ← data/example-trace.jsonl')
  } else {
    fs.writeFileSync(path.join(OUT, 'trace.jsonl'), '')
    console.error('[prepare-data] trace.jsonl: no source → empty')
  }
}

await buildTrace()
