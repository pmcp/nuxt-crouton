#!/usr/bin/env node
/**
 * Reconstruct an invocation trace from Claude Code session transcripts
 * (Loop Station WS2, #929). Promotes + hardens the proven prototype.
 *
 *   node .claude/skills/loop-station/parse-transcripts.mjs [session] [--out trace.jsonl]
 *   node .claude/skills/loop-station/parse-transcripts.mjs --proj <dir> --json
 *
 * Emits trace.jsonl of events { ts, kind, name, parent, depth, agentId?, durMs? }
 * — the real call tree: which skills/agents/tools fired, how they nested, how
 * long sub-agents ran.
 *
 * HARD PRIVACY RULE: names + correlation ids + durations ONLY. Never a tool's
 * `input` or a `tool_result`'s content. The trace is runtime exhaust → gitignored,
 * not committed (unlike WS1's history.jsonl).
 *
 * Two transcript layouts are supported (auto-detected), because Claude Code has
 * shipped both and CI may differ from local:
 *
 *   A. INLINE (current local schema) — sub-agents live in the main transcript as
 *      `isSidechain` records; skills attribute their tool calls with
 *      `attributionSkill`. Nesting comes from the parentUuid tree + those markers.
 *   B. FILES (the prototype's proven layout) — each sub-agent is its own
 *      `<session>/subagents/agent-*.jsonl`, linked to its spawning Agent call by
 *      global start-time order (robust for sync AND async agents). Recurses.
 *
 * Defensive throughout: tolerates malformed JSON lines, missing
 * type/message/content/timestamp, an absent subagents/ dir, and empty files.
 *
 * No deps. Pure ESM. Also importable: `import { parseSession } from './parse-transcripts.mjs'`.
 */

import fs from 'node:fs'
import path from 'node:path'

// ── defensive readers ─────────────────────────────────────────────────────────

/** Read a .jsonl file into records, skipping unparseable/empty lines. Never throws. */
export function readJsonl(file) {
  let text
  try {
    text = fs.readFileSync(file, 'utf8')
  } catch {
    return []
  }
  const out = []
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t) continue
    try {
      const rec = JSON.parse(t)
      if (rec && typeof rec === 'object') out.push(rec)
    } catch {
      /* tolerate a truncated/garbled line (partial flush, schema drift) */
    }
  }
  return out
}

/** tool_use blocks out of one record's message content (defensive on shape). */
function toolUsesOf(rec) {
  const content = rec?.message?.content
  if (!Array.isArray(content)) return []
  const out = []
  for (const b of content) {
    if (b && b.type === 'tool_use' && typeof b.name === 'string') {
      out.push({ id: b.id, name: b.name, input: b.input || {} })
    }
  }
  return out
}

// Classify a tool_use into the trace's three kinds, and derive its display name.
// NB: `input` is read ONLY to pick the human name (skill / subagent_type); it is
// never emitted into the trace.
const SKILL_TOOLS = new Set(['Skill'])
const AGENT_TOOLS = new Set(['Agent', 'Task'])
function kindOf(name) {
  if (SKILL_TOOLS.has(name)) return 'skill'
  if (AGENT_TOOLS.has(name)) return 'agent'
  return 'tool'
}
function nameOf(tu) {
  if (SKILL_TOOLS.has(tu.name)) return String(tu.input.skill || tu.input.command || 'skill')
  if (AGENT_TOOLS.has(tu.name)) {
    return String(tu.input.subagent_type || tu.input.description || 'agent')
  }
  return tu.name
}

// ── layout A: inline (isSidechain + attributionSkill on the parentUuid tree) ──

/**
 * Build events from a single records array where sub-agents are inline
 * `isSidechain` records and skills tag their calls with `attributionSkill`.
 *
 * Depth model (data-grounded):
 *   - agent depth = number of spawning Agent/Task tool_use records on the
 *     parentUuid path while still inside the sidechain subtree. Sidechain records
 *     form a real subtree (they descend from their spawning Task), so counting up
 *     the tree is correct and supports recursion (agent→agent→…).
 *   - +1 if the record carries `attributionSkill` (it ran inside that skill).
 *   parent = innermost open frame: the attributed skill if set, else the nearest
 *   Agent/Task ancestor, else 'root'.
 */
function eventsInline(records) {
  const byUuid = new Map()
  for (const r of records) if (r.uuid) byUuid.set(r.uuid, r)

  // Map uuid → its agent-kind tool_use name (so an ancestor record that issued an
  // Agent/Task call can be identified while walking the tree).
  const agentCallName = new Map()
  for (const r of records) {
    for (const tu of toolUsesOf(r)) {
      if (kindOf(tu.name) === 'agent') agentCallName.set(r.uuid, nameOf(tu))
    }
  }

  const parentOf = (r) => (r?.parentUuid ? byUuid.get(r.parentUuid) : null)

  function frames(r) {
    // Walk up the parentUuid chain, counting Agent/Task ancestors until we leave
    // the sidechain subtree. Returns { agentDepth, nearestAgent }.
    let agentDepth = 0
    let nearestAgent = null
    let cur = r
    let guard = 0
    while (cur && guard++ < 10000) {
      const p = parentOf(cur)
      if (!p) break
      if (agentCallName.has(p.uuid)) {
        agentDepth++
        if (!nearestAgent) nearestAgent = agentCallName.get(p.uuid)
      }
      if (!cur.isSidechain) break // left the sidechain region — stop counting
      cur = p
    }
    return { agentDepth, nearestAgent }
  }

  const events = []
  for (const r of records) {
    const tus = toolUsesOf(r)
    if (tus.length === 0) continue
    const { agentDepth, nearestAgent } = frames(r)
    const skill = typeof r.attributionSkill === 'string' ? r.attributionSkill : null
    const depth = agentDepth + (skill ? 1 : 0)
    const parent = skill || nearestAgent || 'root'
    for (const tu of tus) {
      events.push({
        ts: r.timestamp || null,
        kind: kindOf(tu.name),
        name: nameOf(tu),
        parent,
        depth
      })
    }
  }
  return events
}

// ── layout B: files (subagents/agent-*.jsonl, start-time-order linkage) ────────

/**
 * The prototype's proven approach, hardened. Sub-agent transcripts are linked to
 * Agent/Task calls by global start-time order (works for sync AND async agents).
 * Recurses into each sub-agent file, so agent→agent→… nests to real depth.
 */
function eventsFiles(mainFile, subDir) {
  const subFiles = (() => {
    let names = []
    try {
      names = fs.readdirSync(subDir)
    } catch {
      return []
    }
    return names
      .filter((f) => /^agent-.*\.jsonl$/.test(f))
      .map((f) => {
        const recs = readJsonl(path.join(subDir, f))
        const ts = recs.map((r) => r.timestamp).filter(Boolean).sort()
        return {
          aid: f.replace(/^agent-|\.jsonl$/g, ''),
          file: path.join(subDir, f),
          first: ts[0] || null,
          last: ts[ts.length - 1] || null
        }
      })
      .sort((a, b) => String(a.first || '').localeCompare(String(b.first || '')))
  })()

  let subPtr = 0
  const events = []
  function walk(file, parent, depth, guard) {
    if (guard > 64) return // runaway-recursion backstop
    for (const r of readJsonl(file)) {
      for (const tu of toolUsesOf(r)) {
        const ev = { ts: r.timestamp || null, kind: kindOf(tu.name), name: nameOf(tu), parent, depth }
        events.push(ev)
        if (kindOf(tu.name) === 'agent' && subPtr < subFiles.length) {
          const s = subFiles[subPtr++]
          ev.agentId = s.aid
          if (s.first && s.last) {
            const d = new Date(s.last) - new Date(s.first)
            if (Number.isFinite(d) && d >= 0) ev.durMs = d
          }
          walk(s.file, `${ev.name}:${s.aid.slice(0, 6)}`, depth + 1, guard + 1)
        }
      }
    }
  }
  walk(mainFile, 'root', 0, 0)
  return { events, hadSubFiles: subFiles.length > 0 }
}

// ── graph derivation (nodes ∝ invocations, edges = parent → child) ────────────

export function deriveGraph(events) {
  const nodes = {}
  const edges = {}
  for (const e of events) {
    nodes[e.name] = (nodes[e.name] || 0) + 1
    const from = e.parent ? String(e.parent).split(':')[0] : 'root'
    const key = `${from} → ${e.name}`
    edges[key] = (edges[key] || 0) + 1
  }
  return { nodes, edges }
}

// ── top-level: parse one session (auto-detect layout) ─────────────────────────

export function defaultProj() {
  return (
    process.env.CLAUDE_PROJ ||
    path.join(
      process.env.HOME || '/root',
      '.claude/projects',
      (process.env.CLAUDE_PROJECT_SLUG || '-home-user-nuxt-crouton')
    )
  )
}

export function latestSession(projDir) {
  let files = []
  try {
    files = fs.readdirSync(projDir)
  } catch {
    return null
  }
  const sessions = files
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => {
      let t = 0
      try {
        t = fs.statSync(path.join(projDir, f)).mtimeMs
      } catch {}
      return { f, t }
    })
    .sort((a, b) => b.t - a.t)
  return sessions[0]?.f.replace(/\.jsonl$/, '') || null
}

/**
 * @param {{projDir?:string, session?:string}} opts
 * @returns {{session:string, layout:'inline'|'files'|'empty', events:Array, nodes:object, edges:object}}
 */
export function parseSession(opts = {}) {
  const projDir = opts.projDir || defaultProj()
  const session = opts.session || latestSession(projDir)
  if (!session) return { session: null, layout: 'empty', events: [], nodes: {}, edges: {} }

  const mainFile = path.join(projDir, `${session}.jsonl`)
  const subDir = path.join(projDir, session, 'subagents')

  // Prefer the files layout when sub-agent files actually exist (the richer,
  // duration-carrying signal); otherwise reconstruct from the inline records.
  const filesResult = eventsFiles(mainFile, subDir)
  if (filesResult.hadSubFiles) {
    return { session, layout: 'files', events: filesResult.events, ...deriveGraph(filesResult.events) }
  }
  const records = readJsonl(mainFile)
  const events = eventsInline(records)
  return { session, layout: 'inline', events, ...deriveGraph(events) }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function main(argv) {
  const args = argv.slice(2)
  const flag = (name) => {
    const i = args.indexOf(name)
    return i !== -1 ? args[i + 1] : null
  }
  const out = flag('--out')
  const projDir = flag('--proj') || defaultProj()
  const asJson = args.includes('--json')
  const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1]?.startsWith('--') !== true)
  // first positional that isn't a flag value = session id
  const session = positional.find((a) => !a.startsWith('--')) || null

  const result = parseSession({ projDir, session: session || undefined })

  if (out) {
    fs.writeFileSync(out, result.events.map((e) => JSON.stringify(e)).join('\n') + (result.events.length ? '\n' : ''))
  }
  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    return
  }

  const byKind = result.events.reduce((a, e) => ((a[e.kind] = (a[e.kind] || 0) + 1), a), {})
  process.stderr.write(`session ${result.session} · layout ${result.layout}\n`)
  process.stderr.write(`events: ${result.events.length}  ${JSON.stringify(byKind)}\n`)
  const nested = result.events.filter((e) => e.depth > 0)
  if (nested.length) {
    process.stderr.write(`\nnested (depth > 0):\n`)
    for (const e of nested.slice(0, 40)) {
      process.stderr.write(`  ${'  '.repeat(e.depth)}↳ [${e.kind}] ${e.name}  (under ${e.parent})\n`)
    }
  }
  process.stderr.write(`\ngraph nodes (∝ invocations):\n`)
  for (const [n, c] of Object.entries(result.nodes).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    process.stderr.write(`  ${String(c).padStart(3)} ${n}\n`)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv)
