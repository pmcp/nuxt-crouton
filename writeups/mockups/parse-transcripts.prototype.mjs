#!/usr/bin/env node
// parse-transcripts.mjs — reconstruct an invocation trace from Claude Code
// session transcripts (main + per-subagent), joining on agentId.
// Defensive: tolerates malformed lines and missing fields.
//
// Usage: node parse-transcripts.mjs [sessionId] [--out trace.jsonl]
import fs from 'node:fs'
import path from 'node:path'

const PROJ = process.env.CLAUDE_PROJ
  || '/root/.claude/projects/-home-user-nuxt-crouton'
const raw = process.argv.slice(2)
const outIdx = raw.indexOf('--out')
const OUT = outIdx !== -1 ? raw[outIdx + 1] : null
const args = raw.filter((a, i) => !a.startsWith('--') && i !== outIdx + 1)

function latestSession() {
  return fs.readdirSync(PROJ)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({ f, t: fs.statSync(path.join(PROJ, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0]?.f.replace(/\.jsonl$/, '')
}
const session = args[0] || latestSession()
const mainFile = path.join(PROJ, `${session}.jsonl`)
const subDir = path.join(PROJ, session, 'subagents')

const readJsonl = (file) => !fs.existsSync(file) ? []
  : fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

const flatText = (c) => typeof c === 'string' ? c
  : Array.isArray(c) ? c.map(x => x?.text || '').join(' ') : ''

function toolUses(recs) {
  const out = []
  for (const r of recs) {
    if (r.type !== 'assistant' || !Array.isArray(r.message?.content)) continue
    for (const b of r.message.content)
      if (b.type === 'tool_use') out.push({ id: b.id, name: b.name, input: b.input || {}, ts: r.timestamp })
  }
  return out
}
function toolResults(recs) {
  const m = {}
  for (const r of recs) {
    if (r.type !== 'user' || !Array.isArray(r.message?.content)) continue
    for (const b of r.message.content)
      if (b.type === 'tool_result') m[b.tool_use_id] = flatText(b.content)
  }
  return m
}
const nameFor = (tu) => tu.name === 'Skill' ? (tu.input.skill || 'skill')
  : tu.name === 'Agent' ? (tu.input.subagent_type || 'agent') : tu.name
const kindFor = (tu) => tu.name === 'Skill' ? 'skill' : tu.name === 'Agent' ? 'agent' : 'tool'

// Pre-scan every subagent transcript with its time span; link Agent calls to
// these by start-time order (robust — works for sync AND async agents, unlike
// parsing the async-only "agentId:" banner from result text).
const subFiles = (fs.existsSync(subDir) ? fs.readdirSync(subDir) : [])
  .filter(f => /^agent-.*\.jsonl$/.test(f))
  .map(f => {
    const ts = readJsonl(path.join(subDir, f)).map(r => r.timestamp).filter(Boolean).sort()
    return { aid: f.replace(/^agent-|\.jsonl$/g, ''), file: path.join(subDir, f), first: ts[0], last: ts.at(-1) }
  })
  .sort((a, b) => (a.first || '').localeCompare(b.first || ''))
let subPtr = 0

const events = []
function walk(file, parent, depth) {
  for (const tu of toolUses(readJsonl(file))) {
    const ev = { ts: tu.ts, kind: kindFor(tu), name: nameFor(tu), parent, depth }
    events.push(ev)
    if (tu.name === 'Agent' && subPtr < subFiles.length) {
      const s = subFiles[subPtr++]
      ev.agentId = s.aid
      if (s.first && s.last) ev.durMs = new Date(s.last) - new Date(s.first)
      walk(s.file, `${nameFor(tu)}:${s.aid.slice(0, 6)}`, depth + 1)
    }
  }
}
walk(mainFile, null, 0)

// ---- derive graph (nodes ∝ invocations, edges = parent→child) ----
const nodes = {}, edges = {}
for (const e of events) {
  nodes[e.name] = (nodes[e.name] || 0) + 1
  const from = e.parent ? e.parent.split(':')[0] : 'root'
  const key = `${from} → ${e.name}`
  edges[key] = (edges[key] || 0) + 1
}

// ---- output ----
if (OUT) {
  fs.writeFileSync(OUT, events.map(e => JSON.stringify(e)).join('\n') + '\n')
}
const byKind = events.reduce((a, e) => (a[e.kind] = (a[e.kind] || 0) + 1, a), {})
console.log(`session ${session}`)
console.log(`events: ${events.length}  ${JSON.stringify(byKind)}`)
console.log(`\nagent tree:`)
for (const e of events.filter(e => e.kind === 'agent'))
  console.log(`  ${'  '.repeat(e.depth)}↳ ${e.name} (${e.agentId?.slice(0, 8) || '?'}) · ${e.durMs ? (e.durMs / 1000).toFixed(0) + 's' : '?'}`)
console.log(`\ngraph nodes (∝ invocations):`)
for (const [n, c] of Object.entries(nodes).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(3)} ${n}`)
console.log(`\ngraph edges (parent → child):`)
for (const [k, c] of Object.entries(edges).sort((a, b) => b[1] - a[1])) console.log(`  ${String(c).padStart(3)}  ${k}`)
console.log(`\nsample trace.jsonl lines:`)
for (const e of [events[0], ...events.filter(e => e.kind !== 'tool').slice(0, 3), events.at(-1)].filter(Boolean))
  console.log('  ' + JSON.stringify(e))
