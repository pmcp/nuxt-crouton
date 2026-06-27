/**
 * Threshold scorecard for the Loop Station inventory (WS1, #927).
 *
 * Deliberately FORMULAS, not LLM judgments — the whole point of the inventory is
 * a deterministic, trendable signal. Each dimension reduces to a green/amber/red
 * band by fixed thresholds so the same numbers always grade the same way and a
 * regression is unambiguous at merge time.
 *
 * Thresholds are conservative starting points; tune them in one place here as
 * the harness's real distribution becomes clear.
 *
 * No deps. Pure ESM.
 */

/** Pick a band: value below `amber` is green, below `red` is amber, else red. */
function band(value, amber, red) {
  if (value < amber) return 'green'
  if (value < red) return 'amber'
  return 'red'
}

export const THRESHOLDS = {
  // Always-on context (root CLAUDE.md) token budget.
  alwaysOn: { amber: 12000, red: 18000 },
  // Any single skill / agent file this large is a maintenance smell.
  artifact: { amber: 4000, red: 8000 },
  // Corpus redundancy %.
  redundancy: { amber: 12, red: 25 },
  // Containment % at/above which a pair counts as a drift-risk (kept-in-sync) pair.
  driftPair: 30
}

/**
 * @param {object} input
 * @param {number} input.alwaysOnTokens     root CLAUDE.md token count
 * @param {{path:string, kind:string, tokens:number}[]} input.artifacts
 * @param {{pct:number, topPairs:{a:string,b:string,containment:number}[]}} input.redundancy
 */
export function scorecard({ alwaysOnTokens, artifacts, redundancy }) {
  const T = THRESHOLDS

  // length: anchored on the always-on budget, with a list of oversized artifacts.
  const oversized = artifacts
    .filter((a) => a.tokens >= T.artifact.amber)
    .map((a) => ({ path: a.path, tokens: a.tokens, band: band(a.tokens, T.artifact.amber, T.artifact.red) }))
    .sort((x, y) => y.tokens - x.tokens)
  const length = {
    score: band(alwaysOnTokens, T.alwaysOn.amber, T.alwaysOn.red),
    alwaysOnTokens,
    thresholds: T.alwaysOn,
    oversized
  }

  // redundancy: straight off the corpus %.
  const red = {
    score: band(redundancy.pct, T.redundancy.amber, T.redundancy.red),
    pct: redundancy.pct,
    thresholds: T.redundancy
  }

  // drift-risk: artifact pairs restating each other above the drift threshold must
  // be kept in sync by hand — the more such pairs, the higher the drift risk.
  const driftPairs = (redundancy.topPairs || []).filter((p) => p.containment >= T.driftPair)
  const driftRisk = {
    score: band(driftPairs.length, 2, 5),
    pairs: driftPairs.length,
    threshold: T.driftPair,
    examples: driftPairs.slice(0, 5)
  }

  // Worst band across dimensions = the overall.
  const order = { green: 0, amber: 1, red: 2 }
  const overall = [length.score, red.score, driftRisk.score].reduce(
    (worst, s) => (order[s] > order[worst] ? s : worst),
    'green'
  )

  return { overall, length, redundancy: red, driftRisk }
}
