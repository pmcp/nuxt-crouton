/**
 * Token counting for the Loop Station inventory (WS1, #927).
 *
 * Prefers Anthropic's `count_tokens` endpoint — it's FREE (doesn't consume
 * output tokens) and deterministic (same text → same count). When no
 * `ANTHROPIC_API_KEY` is present (local runs, forks) it falls back to a
 * deterministic lexical heuristic so the gather runs anywhere, offline.
 *
 * The record always carries which counter was used (`tokenizer:
 * 'anthropic' | 'heuristic'`) so a trend isn't silently compared across two
 * different rulers — the WS3 view / WS4 reporter can flag a tokenizer switch.
 *
 * No deps. Pure ESM.
 */

const ENDPOINT = 'https://api.anthropic.com/v1/messages/count_tokens'
const ANTHROPIC_VERSION = '2023-06-01'
// count_tokens needs a model; the count is stable across the modern Claude
// family for our purposes. Overridable for when the default is retired.
const MODEL = process.env.LOOP_STATION_COUNT_MODEL || 'claude-sonnet-4-5'

/**
 * Deterministic lexical token estimate — a stand-in when the API is unavailable.
 * Counts word runs + standalone punctuation, then scales by a sub-word factor
 * (~1.33) that roughly matches BPE granularity on prose/markdown. Crude but
 * STABLE: identical input always yields the identical number, so a trend built
 * from heuristic points is still internally comparable.
 */
export function heuristicTokens(text) {
  if (!text) return 0
  const units = text.match(/[A-Za-z0-9]+|[^\sA-Za-z0-9]/g) || []
  return Math.round(units.length * 1.33)
}

async function apiCountTokens(text, apiKey) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      // A single user message of the raw text — we're measuring the artifact's
      // own token weight, not a full prompt envelope.
      messages: [{ role: 'user', content: text || ' ' }]
    })
  })
  if (!res.ok) throw new Error(`count_tokens ${res.status}: ${await res.text()}`)
  const json = await res.json()
  if (typeof json.input_tokens !== 'number') {
    throw new Error(`count_tokens: unexpected response ${JSON.stringify(json)}`)
  }
  return json.input_tokens
}

/**
 * Build a counter bound to one tokenizer for the whole run. Probes the API once
 * (a tiny call) and, if it works, uses it for every artifact; otherwise every
 * artifact is counted heuristically. Returns `{ tokenizer, count }` where
 * `count(text) -> Promise<number>`.
 */
export async function makeCounter({ apiKey = process.env.ANTHROPIC_API_KEY, force } = {}) {
  if (force === 'heuristic' || !apiKey) {
    return { tokenizer: 'heuristic', count: async (t) => heuristicTokens(t) }
  }
  // Probe: if the key/endpoint is healthy, commit to the API for the run; if the
  // probe fails (bad key, egress blocked) fall back rather than abort the gather.
  try {
    await apiCountTokens('probe', apiKey)
  } catch (err) {
    process.env.LOOP_STATION_DEBUG &&
      console.error(`[loop-station] count_tokens probe failed, using heuristic: ${err.message}`)
    return { tokenizer: 'heuristic', count: async (t) => heuristicTokens(t) }
  }
  return { tokenizer: 'anthropic', count: async (t) => apiCountTokens(t, apiKey) }
}
