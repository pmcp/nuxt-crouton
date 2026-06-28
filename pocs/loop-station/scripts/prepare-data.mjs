#!/usr/bin/env node
/**
 * Data seam for the Loop Station view (WS3, #931).
 *
 * The app ONLY renders — all compute lives in the WS1/WS2 scripts. This step
 * stages their output into public/data/ for the app to fetch:
 *
 *   - history.jsonl  ← the committed WS1 inventory (writeups/loop-station/)
 *   - trace.jsonl    ← WS2: reconstructed from local Claude Code transcripts if
 *                       any exist (real data), else the committed example trace.
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
  // Try the real parser on whatever transcripts this machine has.
  try {
    const mod = await import(
      path.join(REPO, '.claude', 'skills', 'loop-station', 'parse-transcripts.mjs')
    )
    const result = mod.parseSession({})
    if (result.events && result.events.length > 0) {
      const meta = {
        kind: 'meta',
        source: 'live',
        session: result.session,
        layout: result.layout,
        eventCount: result.events.length
      }
      const lines = [JSON.stringify(meta), ...result.events.map((e) => JSON.stringify(e))]
      fs.writeFileSync(path.join(OUT, 'trace.jsonl'), lines.join('\n') + '\n')
      console.error(`[prepare-data] trace.jsonl ← live session ${result.session} (${result.events.length} events)`)
      return
    }
  } catch (err) {
    console.error(`[prepare-data] live parse unavailable (${err.message}); using example`)
  }
  // Fallback: the committed real example (so the deployed build always has a graph).
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
