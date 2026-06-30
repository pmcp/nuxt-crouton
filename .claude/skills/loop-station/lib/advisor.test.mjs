/**
 * Tests for the WS5 advisor gate (#933).
 *   node --test .claude/skills/loop-station/lib/advisor.test.mjs
 *
 * The advisor is the deterministic "should we bother the human?" gate, so its
 * decisions must be predictable: reds + sharp growth flag; a quiet/baseline state
 * stays silent; deltas across different tokenizers are NOT compared.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyze, ADVISOR } from '../advisor.mjs'

const rec = (over = {}) => ({
  commit: over.commit || 'abc1234',
  pr: over.pr ?? null,
  tokenizer: over.tokenizer || 'anthropic',
  totals: { alwaysOnTokens: over.tokens ?? 10000 },
  redundancy: { pct: over.red ?? 5, topPairs: [] },
  scorecard: {
    overall: over.overall || 'green',
    length: { score: over.lengthBand || 'green', alwaysOnTokens: over.tokens ?? 10000, oversized: [] },
    redundancy: { score: over.redBand || 'green', pct: over.red ?? 5 },
    driftRisk: { score: over.driftBand || 'green', pairs: over.drift ?? 0, examples: [] }
  }
})

test('no records → not actionable', () => {
  const r = analyze([])
  assert.equal(r.actionable, false)
  assert.equal(r.findings.length, 0)
})

test('all-green single point → silent (nothing to report)', () => {
  const r = analyze([rec()])
  assert.equal(r.actionable, false)
})

test('scorecard red bands surface as findings', () => {
  const r = analyze([rec({ lengthBand: 'red', redBand: 'red', driftBand: 'red', overall: 'red' })])
  assert.equal(r.actionable, true)
  const dims = r.findings.map((f) => f.dim).sort()
  assert.deepEqual(dims, ['drift-risk', 'length', 'redundancy'])
})

test('sharp always-on growth (same tokenizer) flags a growth finding', () => {
  const prev = rec({ tokens: 10000 })
  const next = rec({ tokens: 10000 + ADVISOR.growthTokens + 1 })
  const r = analyze([prev, next])
  const growth = r.findings.find((f) => f.dim === 'growth')
  assert.ok(growth, 'growth finding present')
  assert.equal(growth.evidence.to, 10000 + ADVISOR.growthTokens + 1)
})

test('growth across DIFFERENT tokenizers is NOT compared (no false alarm)', () => {
  const prev = rec({ tokens: 10000, tokenizer: 'heuristic' })
  const next = rec({ tokens: 18000, tokenizer: 'anthropic' }) // big jump but ruler changed
  const r = analyze([prev, next])
  assert.ok(!r.findings.some((f) => f.dim === 'growth'), 'no growth finding across tokenizers')
})

test('redundancy jump (same tokenizer) flags', () => {
  const prev = rec({ red: 5 })
  const next = rec({ red: 5 + ADVISOR.redundancyJumpPct + 1 })
  const r = analyze([prev, next])
  assert.ok(r.findings.some((f) => f.dim === 'redundancy-growth'))
})

test('analyze is deterministic', () => {
  const input = [rec({ tokens: 10000 }), rec({ lengthBand: 'red', tokens: 20000 })]
  assert.deepEqual(analyze(input), analyze(input))
})
