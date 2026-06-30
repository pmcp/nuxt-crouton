/**
 * Tests for the WS2 transcript parser (#929). Run:
 *   node --test .claude/skills/loop-station/lib/parse-transcripts.test.mjs
 *
 * Synthetic transcripts are written to a temp project dir so the linkage logic is
 * covered deterministically — no dependency on a live ~/.claude session. Covers
 * both layouts, 2-level recursion, payload-freeness, and defensiveness.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseSession, readJsonl } from '../parse-transcripts.mjs'

const ALLOWED_KEYS = new Set(['ts', 'kind', 'name', 'parent', 'depth', 'agentId', 'durMs'])

function tmpProj() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'loopstation-'))
}
const writeJsonl = (file, recs) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, recs.map((r) => JSON.stringify(r)).join('\n') + '\n')
}
const asst = (uuid, parentUuid, tu, extra = {}) => ({
  type: 'assistant',
  uuid,
  parentUuid,
  timestamp: extra.ts || '2026-01-01T00:00:00.000Z',
  message: { content: [{ type: 'tool_use', id: `tu-${uuid}`, name: tu.name, input: tu.input || {} }] },
  ...extra
})

test('inline layout: a skill nests its attributed tool calls one level down', () => {
  const proj = tmpProj()
  const s = 'sess-skill'
  writeJsonl(path.join(proj, `${s}.jsonl`), [
    asst('u1', null, { name: 'Bash', input: { command: 'ls' } }), // depth 0, main line
    asst('u2', 'u1', { name: 'Skill', input: { skill: 'commit' } }), // skill invocation
    asst('u3', 'u2', { name: 'Bash', input: { command: 'git add' } }, { attributionSkill: 'commit' }),
    asst('u4', 'u3', { name: 'Bash', input: { command: 'git commit' } }, { attributionSkill: 'commit' })
  ])
  const { layout, events } = parseSession({ projDir: proj, session: s })
  assert.equal(layout, 'inline')
  const skillCalls = events.filter((e) => e.kind === 'tool' && e.parent === 'commit')
  assert.equal(skillCalls.length, 2, 'both git calls attributed under the skill')
  assert.ok(skillCalls.every((e) => e.depth === 1))
  assert.equal(events.find((e) => e.kind === 'skill').name, 'commit')
})

test('inline layout: 2-level sub-agent recursion links to the correct depth', () => {
  const proj = tmpProj()
  const s = 'sess-recurse'
  writeJsonl(path.join(proj, `${s}.jsonl`), [
    // main line spawns Explore
    asst('m1', null, { name: 'Task', input: { subagent_type: 'Explore' } }),
    { type: 'user', uuid: 'm2', parentUuid: 'm1', message: { content: [{ type: 'tool_result', tool_use_id: 'tu-m1', content: 'ok' }] } },
    // Explore's sidechain: a Bash, then it spawns a deeper agent
    asst('a1', 'm1', { name: 'Bash', input: { command: 'grep' } }, { isSidechain: true }),
    asst('a2', 'a1', { name: 'Agent', input: { subagent_type: 'deep' } }, { isSidechain: true }),
    // the deep agent's sidechain: a Read
    asst('a3', 'a2', { name: 'Read', input: { file_path: '/x' } }, { isSidechain: true })
  ])
  const { events } = parseSession({ projDir: proj, session: s })
  const explore = events.find((e) => e.name === 'Explore')
  const bash = events.find((e) => e.name === 'Bash')
  const deep = events.find((e) => e.name === 'deep')
  const read = events.find((e) => e.name === 'Read')
  assert.equal(explore.depth, 0)
  assert.equal(bash.depth, 1)
  assert.equal(deep.depth, 1)
  assert.equal(read.depth, 2, 'a sub-agent spawned by a sub-agent nests to depth 2')
  assert.equal(read.parent, 'deep')
})

test('files layout: subagents/agent-*.jsonl recurse to depth 2 with durations', () => {
  const proj = tmpProj()
  const s = 'sess-files'
  writeJsonl(path.join(proj, `${s}.jsonl`), [
    asst('m1', null, { name: 'Agent', input: { subagent_type: 'Explore' } }, { ts: '2026-01-01T00:00:00.000Z' })
  ])
  // earlier-starting file = the Explore agent (linked first by start-time order)
  writeJsonl(path.join(proj, s, 'subagents', 'agent-aaaaaa.jsonl'), [
    asst('e1', null, { name: 'Bash', input: {} }, { ts: '2026-01-01T00:00:01.000Z' }),
    asst('e2', 'e1', { name: 'Agent', input: { subagent_type: 'deep' } }, { ts: '2026-01-01T00:00:02.000Z' })
  ])
  // later-starting file = the deep agent
  writeJsonl(path.join(proj, s, 'subagents', 'agent-bbbbbb.jsonl'), [
    asst('d1', null, { name: 'Read', input: {} }, { ts: '2026-01-01T00:00:05.000Z' })
  ])
  const { layout, events } = parseSession({ projDir: proj, session: s })
  assert.equal(layout, 'files')
  const read = events.find((e) => e.name === 'Read')
  assert.equal(read.depth, 2, 'deep agent under Explore under root → depth 2')
  const explore = events.find((e) => e.name === 'Explore')
  assert.equal(explore.agentId, 'aaaaaa')
  assert.equal(explore.durMs, 1000, 'duration = last - first timestamp of the sub-file')
})

test('trace carries names + ids + durations ONLY — never tool payloads', () => {
  const proj = tmpProj()
  const s = 'sess-priv'
  writeJsonl(path.join(proj, `${s}.jsonl`), [
    asst('u1', null, { name: 'Bash', input: { command: 'cat /etc/passwd', secret: 'shh' } })
  ])
  const { events } = parseSession({ projDir: proj, session: s })
  const serialized = JSON.stringify(events)
  assert.ok(!serialized.includes('passwd'), 'no command input in the trace')
  assert.ok(!serialized.includes('shh'), 'no input fields leak')
  for (const e of events) {
    for (const k of Object.keys(e)) assert.ok(ALLOWED_KEYS.has(k), `unexpected key "${k}" in event`)
  }
})

test('defensive: malformed lines, missing fields, and no subagents dir do not crash', () => {
  const proj = tmpProj()
  const s = 'sess-bad'
  const file = path.join(proj, `${s}.jsonl`)
  fs.mkdirSync(proj, { recursive: true })
  fs.writeFileSync(
    file,
    [
      '{ this is not json',
      '',
      JSON.stringify({ type: 'assistant' }), // no message
      JSON.stringify({ type: 'assistant', message: { content: 'plain string' } }), // wrong content shape
      JSON.stringify(asst('u1', null, { name: 'Bash', input: {} })), // one good event
      '{"truncated":'
    ].join('\n')
  )
  const { events } = parseSession({ projDir: proj, session: s })
  assert.equal(events.length, 1)
  assert.equal(events[0].name, 'Bash')
  // readJsonl on a missing file returns [] rather than throwing
  assert.deepEqual(readJsonl(path.join(proj, 'nope.jsonl')), [])
})

test('empty/absent session → empty trace, no throw', () => {
  const proj = tmpProj()
  const r = parseSession({ projDir: proj, session: 'does-not-exist' })
  assert.equal(r.events.length, 0)
})
