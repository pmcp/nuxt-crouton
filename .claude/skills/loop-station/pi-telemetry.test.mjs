/**
 * Tests for the pi.dev telemetry adapter (#944). Runs against the REAL captured fixtures in
 * pocs/loop-station/data/pi-telemetry-sample/ (sanitized samples from the mac-mini, #938).
 * Dependency-free: `node .claude/skills/loop-station/pi-telemetry.test.mjs`.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  subagentMetaToRunOutcome,
  sessionUsageFromJsonl,
  subagentMetasToWs2Events,
  runOutcomeToLedgerRecord,
  buildPiTrace,
  outcomeFromExitCode,
  providerFromModel,
  normalizeModel,
} from './pi-telemetry.mjs'
import { validate } from '../../../scripts/eval-ledger/schema.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SAMPLE = path.join(HERE, '..', '..', '..', 'pocs', 'loop-station', 'data', 'pi-telemetry-sample')
const meta = JSON.parse(fs.readFileSync(path.join(SAMPLE, 'subagent-artifacts', '8a6fa2d3_worker_0_meta.json'), 'utf8'))
const jsonl = fs.readFileSync(path.join(SAMPLE, 'session-sample.jsonl'), 'utf8')

let passed = 0
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`) }

// ── helpers ──
test('providerFromModel splits on "/"', () => {
  assert.equal(providerFromModel('anthropic/claude-haiku-4-5-20251001:high'), 'anthropic')
  assert.equal(providerFromModel('claude-haiku-4-5'), null)
})
test('normalizeModel strips the :thinking qualifier', () => {
  assert.equal(normalizeModel('anthropic/claude-haiku-4-5-20251001:high'), 'anthropic/claude-haiku-4-5-20251001')
  assert.equal(normalizeModel('claude-haiku-4-5'), 'claude-haiku-4-5')
})
test('outcomeFromExitCode maps 0→success, else→failure', () => {
  assert.equal(outcomeFromExitCode(0), 'success')
  assert.equal(outcomeFromExitCode(1), 'failure')
  assert.equal(outcomeFromExitCode(undefined), 'error')
})

// ── subagent meta → PiRunOutcome ──
test('subagentMetaToRunOutcome maps the real worker sample', () => {
  const o = subagentMetaToRunOutcome(meta)
  assert.equal(o.runId, '8a6fa2d3')
  assert.equal(o.agent, 'worker')
  assert.equal(o.harness, 'pi')
  assert.equal(o.provider, 'anthropic')
  assert.equal(o.model, 'anthropic/claude-haiku-4-5-20251001') // :high stripped
  assert.equal(o.costUsd, 0.4202159)
  assert.equal(o.turns, 45)
  assert.equal(o.durationMs, 192340)
  assert.equal(o.outcome, 'success')
  assert.equal(o.tokens.total, 459 + 9236 + 2772244 + 77082)
})
test('PRIVACY: the outcome carries no task/prompt/content', () => {
  const o = subagentMetaToRunOutcome(meta)
  const blob = JSON.stringify(o)
  assert.ok(!('task' in o), 'task field must not be forwarded')
  assert.ok(!/REDACTED/.test(blob), 'no redacted prompt text may leak through')
})

// ── session JSONL → usage rollup (no content) ──
test('sessionUsageFromJsonl sums assistant usage only', () => {
  const u = sessionUsageFromJsonl(jsonl)
  assert.equal(u.messageCount, 1) // one assistant message in the sample
  assert.equal(u.model, 'claude-haiku-4-5-20251001')
  assert.equal(u.costUsd, 0.05511375)
  assert.equal(u.tokens.cacheWrite, 43751)
  assert.ok(!/REDACTED/.test(JSON.stringify(u)), 'no content leaks into the rollup')
})

// ── WS2 events ──
test('subagentMetasToWs2Events emits a valid agent node', () => {
  const events = subagentMetasToWs2Events([meta])
  assert.equal(events.length, 1)
  const e = events[0]
  assert.equal(e.kind, 'agent')      // the app renders 'agent' (orange)
  assert.equal(e.name, 'worker')
  assert.equal(e.parent, 'root')
  assert.equal(e.depth, 0)
  assert.equal(e.agentId, '8a6fa2d3')
  assert.equal(e.durMs, 192340)
  assert.ok(typeof e.ts === 'string' && !Number.isNaN(Date.parse(e.ts)))
})
test('buildPiTrace reads the fixture dir and adds a meta header', () => {
  const trace = buildPiTrace(SAMPLE)
  assert.ok(trace, 'fixture dir should yield a trace')
  assert.equal(trace.meta.source, 'pi')
  assert.equal(trace.meta.eventCount, trace.events.length)
  assert.ok(trace.events.length >= 1)
})

// ── ledger feed: the slice must pass the REAL #883 validator ──
test('runOutcomeToLedgerRecord produces a record the #883 schema accepts', () => {
  const o = subagentMetaToRunOutcome(meta)
  const rec = runOutcomeToLedgerRecord(o, { flow: 'decompose-pidev', skill: 'task-decompose', ref: 'https://github.com/x/y/pull/1', artifact_gate: 'pass', ci: 'pass', outcome: 'merged' })
  const res = validate(rec)
  assert.ok(res.ok, 'ledger validate() must accept the mapped record: ' + JSON.stringify(res.errors))
  assert.equal(res.record.harness, 'pi')
  assert.equal(res.record.model, 'anthropic/claude-haiku-4-5-20251001')
  assert.equal(res.record.cost_usd, 0.4202159)
  assert.equal(res.record.turns, 45)
  assert.equal(res.record.wall_s, 192) // 192340ms → 192s
})

console.log(`\npi-telemetry adapter: ${passed} tests passed`)
