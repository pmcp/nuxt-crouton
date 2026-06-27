/**
 * Deterministic self-tests for the Loop Station inventory math (WS1, #927).
 * Run: node --test .claude/skills/loop-station/lib/loop-station.test.mjs
 *
 * These assert the two properties the inventory relies on: the measures are
 * DETERMINISTIC (a trend built from them is meaningful), and restatement
 * actually registers (the whole point).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { redundancy, shingles, containment, selfRedundancy } from './redundancy.mjs'
import { scorecard, THRESHOLDS } from './scorecard.mjs'
import { heuristicTokens } from './tokens.mjs'

const para = 'the quick brown fox jumps over the lazy dog and then keeps on running far away'

test('heuristicTokens is deterministic and grows with length', () => {
  assert.equal(heuristicTokens(para), heuristicTokens(para))
  assert.ok(heuristicTokens(para + ' ' + para) > heuristicTokens(para))
  assert.equal(heuristicTokens(''), 0)
})

test('redundancy is deterministic for the same input', () => {
  const arts = [
    { path: 'a', text: para },
    { path: 'b', text: 'completely different words with no overlap whatsoever here ok' }
  ]
  assert.deepEqual(redundancy(arts), redundancy(arts))
})

test('cross-file restatement registers as containment + a top pair', () => {
  const arts = [
    { path: 'root', text: para + ' extra unique tail words for the root only here' },
    { path: 'echo', text: para } // verbatim restatement of the shared paragraph
  ]
  const r = redundancy(arts, { minContainment: 0.1 })
  assert.ok(r.pct > 0, 'corpus redundancy should be > 0 when content is restated')
  assert.ok(r.topPairs.length >= 1, 'a restated pair should surface')
  assert.ok(r.topPairs[0].containment > 50, 'the smaller file is largely contained in the larger')
})

test('intra-file restatement registers as self-redundancy', () => {
  const single = selfRedundancy(para)
  const doubled = selfRedundancy(para + ' ' + para)
  assert.equal(single.pct, 0)
  assert.ok(doubled.pct > 0, 'a section repeated within one file should self-register')
})

test('containment is symmetric in ratio and bounded [0,1]', () => {
  const a = shingles(para)
  const b = shingles(para + ' tail words')
  const c = containment(a, b)
  assert.ok(c.ratio >= 0 && c.ratio <= 1)
})

test('scorecard bands are pure formulas (deterministic, threshold-driven)', () => {
  const green = scorecard({
    alwaysOnTokens: 1000,
    artifacts: [{ path: 'x', kind: 'skill', tokens: 500 }],
    redundancy: { pct: 1, topPairs: [] }
  })
  assert.equal(green.overall, 'green')

  const red = scorecard({
    alwaysOnTokens: THRESHOLDS.alwaysOn.red + 1,
    artifacts: [{ path: 'x', kind: 'claudemd', tokens: THRESHOLDS.artifact.red + 1 }],
    redundancy: { pct: THRESHOLDS.redundancy.red + 1, topPairs: [] }
  })
  assert.equal(red.length.score, 'red')
  assert.equal(red.redundancy.score, 'red')
  assert.equal(red.overall, 'red')
})
