#!/usr/bin/env node
/**
 * Render a daily epic-progress digest to HTML + plain text.
 *
 *   node render.mjs <data.json> [--out-dir writeups/reports] [--date YYYYMMDD]
 *
 * Dependency-free (no npm deps, no network). Reads a JSON data file produced by
 * the /epic-digest gather step (see SKILL.md for the schema) and writes:
 *
 *   <out-dir>/epic-digest-<YYYYMMDD>.html   email-safe HTML (inline styles, table layout)
 *   <out-dir>/epic-digest-<YYYYMMDD>.txt    plain-text mirror
 *
 * The HTML is built for forwarding: inline styles, a light theme with emerald
 * accents, progress bars as nested elements, and a <details> per epic for the
 * sub-issue breakdown (collapsed by default — "at a glance, drill in if needed").
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'

// ── args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const positional = args.filter((a) => !a.startsWith('--'))
const input = positional[0]
if (!input) {
  console.error('Usage: render.mjs <data.json> [--out-dir DIR] [--date YYYYMMDD]')
  process.exit(1)
}
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`)
  return i !== -1 ? args[i + 1] : dflt
}

const data = JSON.parse(readFileSync(resolve(input), 'utf8'))
const generated = data.generatedAt ? new Date(data.generatedAt) : new Date()
const stamp = flag('date', generated.toISOString().slice(0, 10).replace(/-/g, ''))
const outDir = flag('out-dir', 'writeups/reports')
const repo = data.repo || 'repo'
const windowHours = data.windowHours ?? 24

// ── helpers ─────────────────────────────────────────────────────────────────
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const prettyDate = generated.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
})

// Status is the ONE place colour is allowed to carry meaning. `cls` lets the
// dark-mode <style> block brighten each hue for a dark background.
const STATUS = {
  blocked: { label: 'Blocked', fg: '#a8503f', cls: 's-blocked' },
  'in-progress': { label: 'In progress', fg: '#9a7b3f', cls: 's-prog' },
  done: { label: 'Done', fg: '#5f7350', cls: 's-done' },
  open: { label: 'Open', fg: '#8a8276', cls: 's-open' }
}
const statusOf = (epic) => {
  if (epic.blocked || epic.status === 'blocked') return STATUS.blocked
  if (epic.total > 0 && epic.done >= epic.total) return STATUS.done
  if (epic.status === 'in-progress') return STATUS['in-progress']
  return STATUS[epic.status] || STATUS.open
}
const pct = (e) => (e.total > 0 ? Math.round((e.done / e.total) * 100) : 0)

const activity = data.activity || {}
const epics = (data.epics || []).slice().sort((a, b) => {
  // blocked first, then most-active (highest %) so the eye lands on what matters
  const ba = a.blocked ? 1 : 0, bb = b.blocked ? 1 : 0
  if (ba !== bb) return bb - ba
  return pct(b) - pct(a)
})

// Loose tickets: open issues that belong to no epic (no `epic` label, no parent).
// Grouped by type so a pile of chores reads as one block, not noise.
const loose = (data.loose || []).slice()
const TYPE_LABEL = {
  feat: 'Features', fix: 'Fixes', refactor: 'Refactors', perf: 'Performance',
  test: 'Tests', docs: 'Docs', chore: 'Chores'
}
const TYPE_ORDER = ['feat', 'fix', 'refactor', 'perf', 'test', 'docs', 'chore']
const normType = (t) => String(t ?? '').replace(/^type:/, '') || 'other'
function looseGroups(items) {
  const m = new Map()
  for (const it of items) {
    const k = normType(it.type)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(it)
  }
  return [...m.keys()]
    .sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })
    .map((k) => [k, m.get(k)])
}

// Actionables: things that LANDED in the window and want the owner's eyes — each
// carrying the human "How to test" steps the author already wrote. `kind` is
// "pr" (a merged PR) or "epic" (one that just hit 100% → do one QA pass).
const actionables = (data.actionables || []).slice().sort((a, b) => {
  // completed epics first (the "do one QA pass" cards), then visual changes
  const ka = a.kind === 'epic' ? 0 : 1, kb = b.kind === 'epic' ? 0 : 1
  if (ka !== kb) return ka - kb
  return (b.hasVisual ? 1 : 0) - (a.hasVisual ? 1 : 0)
})

// ── HTML ─────────────────────────────────────────────────────────────────────
// Editorial, not a dashboard: black serif on white paper, cardless — sections
// and items separated by hairline rules and air, with small-caps headings and a
// heavy masthead rule. Colour is rationed to almost nothing: a single
// fluorescent highlighter-marker swipe, used only where attention is genuinely
// earned (the "Needs your eyes" heading; a blocked status). Everything else is
// ink. Semantic classes (.ink/.sub/.mut/.lnk/.rule/.track/.bar/.rule-strong) let
// the <style> block invert to a near-black night mode; inline values are the
// light fallback for clients that strip <style>.
const C = {
  ink: '#1a1a1a', sub: '#474744', mut: '#8a8a84', faint: '#bdbdb6',
  page: '#ffffff', border: '#e7e6e1', track: '#ececea'
}
const serif = `'Iowan Old Style','Palatino Linotype',Palatino,'Book Antiqua',Georgia,'Times New Roman',serif`
const linkS = `class="lnk" style="color:${C.ink};text-decoration:underline;text-decoration-color:${C.faint};text-underline-offset:3px"`
const num = (n) => `<span class="mut" style="color:${C.faint}">#${esc(n)}</span>`
// Fluorescent highlighter — a marker swipe over the lower part of the text. The
// text stays dark (a real marker leaves ink legible over a bright stripe), so it
// reads identically in light and night mode. Used SPARINGLY, by design.
const HL = { attn: '#fdf06a', warn: '#ff9d6b' }
const mark = (t, c = HL.attn) =>
  `<span style="background-image:linear-gradient(transparent 28%, ${c} 28%, ${c} 90%, transparent 90%);` +
  `-webkit-box-decoration-break:clone;box-decoration-break:clone;color:#1a1a1a;padding:0 .1em">${t}</span>`
// Status as a quiet lowercase word; only "blocked" earns a highlighter mark.
const badge = (s) =>
  s.cls === 's-blocked'
    ? mark(s.label.toLowerCase(), HL.warn)
    : `<span class="mut" style="font-style:italic;font-size:14px;color:${C.mut};white-space:nowrap">${s.label.toLowerCase()}</span>`
// Small-caps serif heading — a chapter marker, optionally highlighted.
const sectionLabel = (t, hl) =>
  `<div class="ink" style="font-variant:small-caps;letter-spacing:.06em;font-size:20px;color:${C.ink}">${hl ? mark(t, hl) : t}</div>`
const detailHead = (t, m = '16px 0 5px') =>
  `<div class="mut" style="font-variant:small-caps;letter-spacing:.05em;font-size:14px;color:${C.mut};margin:${m}">${t}</div>`

function actionableCard(a) {
  const isEpic = a.kind === 'epic'
  const tag = `<span class="mut" style="font-style:italic;font-size:14px;color:${C.mut};white-space:nowrap">${isEpic ? 'complete' : 'merged'}</span>`
  const note = isEpic ? 'At 100% — one last look.' : ''
  const visual = a.hasVisual ? '👁 visual' : ''
  const sub = [note, visual].filter(Boolean).join('  ·  ')
  const subLine = sub
    ? `<div class="mut" style="font-style:italic;color:${C.mut};font-size:13px;margin-top:8px">${sub}</div>`
    : ''
  const stepCount = (a.testSteps && a.testSteps.length) || 0
  const stepsBlock = stepCount
    ? `<details style="margin-top:16px">
         <summary class="mut" style="cursor:pointer;font-style:italic;color:${C.mut};font-size:13px;outline:none">how to test (${stepCount})</summary>
         <ol class="sub rule" style="margin:12px 0 0;padding:0 0 0 20px;border-left:1px solid ${C.border};color:${C.sub};font-size:15px;line-height:1.85">${a.testSteps.map((s) => `<li style="padding-left:6px;margin:3px 0">${esc(s)}</li>`).join('')}</ol>
       </details>`
    : `<div class="mut" style="font-style:italic;color:${C.mut};font-size:13px;margin-top:12px">No test steps yet.</div>`
  const links = [
    `<a href="${esc(a.url)}" ${linkS}>${isEpic ? `Verify rollup #${esc(a.number)}` : `PR #${esc(a.number)}`}</a>`
  ]
  if (a.previewUrl) links.push(`<a href="${esc(a.previewUrl)}" ${linkS}>staging preview</a>`)
  return `
  <tr><td class="rule" style="padding:22px 0;border-top:1px solid ${C.border}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:18px;font-weight:400;line-height:1.5;color:${C.ink}">
        <a href="${esc(a.url)}" class="ink lnk" style="color:${C.ink};text-decoration:none">${num(a.number)} · ${esc(a.title)}</a>
      </td>
      <td align="right" valign="top" style="white-space:nowrap;padding-left:12px">${tag}</td>
    </tr></table>
    ${subLine}
    ${stepsBlock}
    <div style="margin-top:18px;font-size:13px">${links.join(' &nbsp;·&nbsp; ')}</div>
  </td></tr>`
}

function actionablesSection(items) {
  if (!items || !items.length) return ''
  return `
    <tr><td style="padding:32px 0 6px">
      ${sectionLabel('Needs your eyes', HL.attn)}
      <div class="mut" style="font-style:italic;color:${C.mut};font-size:14px;margin-top:8px">${items.length} shipped in the last ${windowHours}h.</div>
    </td></tr>
    ${items.map(actionableCard).join('')}`
}

const ACTIVITY_CAP = 8
function activityList(items, emptyText, cap = ACTIVITY_CAP) {
  if (!items || !items.length) return `<div class="mut" style="font-style:italic;color:${C.mut};font-size:14px;margin:2px 0 0">${emptyText}</div>`
  const shown = items.slice(0, cap)
  const rest = items.length - shown.length
  const rows = shown
    .map(
      (it) =>
        `<div style="font-size:15px;line-height:1.8;margin:1px 0">` +
        `<a href="${esc(it.url)}" ${linkS}>#${esc(it.number)}</a> ` +
        `<span class="sub" style="color:${C.sub}">${esc(it.title)}</span></div>`
    )
    .join('')
  const more = rest > 0
    ? `<div class="mut" style="font-style:italic;color:${C.mut};font-size:13px;margin:4px 0 0">+ ${rest} more</div>`
    : ''
  return rows + more
}

function statBox(n, label, i) {
  const div = i ? `border-left:1px solid ${C.border}` : ''
  return (
    `<td align="center" valign="top" class="rule" style="width:33.33%;padding:4px 8px;${div}">` +
    `<div class="ink" style="font-size:34px;font-weight:400;color:${C.ink};line-height:1">${n}</div>` +
    `<div class="mut" style="font-variant:small-caps;letter-spacing:.05em;color:${C.mut};font-size:13px;margin-top:6px">${label}</div>` +
    `</td>`
  )
}

function labeledLine(label, text) {
  if (!text) return ''
  // A small-caps caption above full-width prose — reads like a margin note.
  return (
    `<div style="margin-top:20px">` +
    `<div class="mut" style="font-variant:small-caps;letter-spacing:.05em;color:${C.mut};font-size:13px;margin:0 0 5px">${label}</div>` +
    `<div class="sub" style="color:${C.sub};font-size:15px;line-height:1.8">${esc(text)}</div>` +
    `</div>`
  )
}

function epicCard(e) {
  const s = statusOf(e)
  const p = pct(e)
  const isBlocked = e.blocked || e.status === 'blocked'
  // The bar's length is the meaning, so its fill is plain ink — it only takes a
  // highlighter colour (and so does the status word) when something is blocked.
  const barColor = isBlocked ? HL.warn : C.ink
  const barCls = isBlocked ? 'bar-blocked' : 'bar'
  const children = e.children || []
  const childRows = children
    .map((c) => {
      const closed = c.state === 'closed'
      const glyph = closed ? '✓' : '○'
      const titleStyle = closed ? `color:${C.faint};text-decoration:line-through` : `color:${C.sub}`
      const titleCls = closed ? 'mut' : 'sub'
      const cs = c.status && STATUS[c.status]
      const tag = cs && !closed
        ? (cs.cls === 's-blocked'
            ? ` ${mark(cs.label.toLowerCase(), HL.warn)}`
            : ` <span class="mut" style="font-style:italic;font-size:13px;color:${C.mut}">${cs.label.toLowerCase()}</span>`)
        : ''
      return (
        `<div style="font-size:15px;line-height:1.95;padding:2px 0">` +
        `<span class="mut" style="color:${C.faint}">${glyph}</span> ` +
        `<a href="${esc(c.url)}" ${linkS}>#${esc(c.number)}</a> ` +
        `<span class="${titleCls}" style="${titleStyle}">${esc(c.title)}</span>${tag}</div>`
      )
    })
    .join('')

  return `
  <tr><td class="rule" style="padding:24px 0;border-top:1px solid ${C.border}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:18px;font-weight:400;line-height:1.5;color:${C.ink}">
        <a href="${esc(e.url)}" class="ink lnk" style="color:${C.ink};text-decoration:none">${num(e.number)} · ${esc(e.title)}</a>
      </td>
      <td align="right" valign="top" style="white-space:nowrap;padding-left:12px">${badge(s)}</td>
    </tr></table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px"><tr>
      <td style="width:100%;padding-right:14px">
        <div class="track" style="background:${C.track};border-radius:2px;height:4px;width:100%">
          <div class="${barCls}" style="background:${barColor};border-radius:2px;height:4px;width:${p}%"></div>
        </div>
      </td>
      <td class="mut" style="white-space:nowrap;font-style:italic;color:${C.mut};font-size:13px">${e.done} of ${e.total}</td>
    </tr></table>

    ${labeledLine('Hypothesis', e.theHypothesis || e.theBet || e.whatItIs)}
    ${labeledLine("We'll know by", e.weWillKnowBy)}
    ${labeledLine('Where we are', e.whereWeAre || e.recentActivity)}

    ${
      children.length
        ? `<details style="margin-top:22px">
             <summary class="mut" style="cursor:pointer;font-variant:small-caps;letter-spacing:.05em;color:${C.mut};font-size:13px;outline:none">sub-issues (${children.length})</summary>
             <div class="rule" style="margin-top:14px;padding-top:14px;border-top:1px solid ${C.border}">${childRows}</div>
           </details>`
        : ''
    }
  </td></tr>`
}

function looseSection(items) {
  if (!items || !items.length) return ''
  const blocks = looseGroups(items)
    .map(([k, rows]) => {
      const lines = rows
        .map(
          (it) =>
            `<div style="font-size:15px;line-height:1.8;margin:1px 0">` +
            `<a href="${esc(it.url)}" ${linkS}>#${esc(it.number)}</a> ` +
            `<span class="sub" style="color:${C.sub}">${esc(it.title)}</span></div>`
        )
        .join('')
      return `<div class="mut" style="font-variant:small-caps;letter-spacing:.05em;color:${C.mut};font-size:13px;margin:16px 0 5px">${esc(TYPE_LABEL[k] || k)}</div>${lines}`
    })
    .join('')
  return `
    <tr><td style="padding:34px 0 6px">
      ${sectionLabel('Loose threads')}
    </td></tr>
    <tr><td class="rule" style="padding:18px 0 0;border-top:1px solid ${C.border}">
      <div class="mut" style="font-style:italic;color:${C.mut};font-size:13px">${items.length} open issue${items.length === 1 ? '' : 's'} under no epic</div>
      ${blocks}
    </td></tr>`
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<title>Epic digest · ${esc(prettyDate)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { -webkit-text-size-adjust:100%; }
  @media only screen and (max-width:600px) {
    .outer-pad { padding:28px 18px !important; }
    .digest-title { font-size:28px !important; }
  }
  /* Night mode: near-black paper, off-white ink. The highlighter marks keep their
     dark text on a bright stripe (legible in both modes), so colour stays scarce
     and meaningful here too. */
  @media (prefers-color-scheme: dark) {
    .page        { background:#0e0e0d !important; }
    .ink         { color:#ededea !important; }
    .ink.lnk     { color:#ededea !important; }
    .sub         { color:#bdbdb6 !important; }
    .mut         { color:#8f8f88 !important; }
    .lnk         { color:#ededea !important; text-decoration-color:#5a5a55 !important; }
    .rule        { border-color:#2a2a27 !important; }
    .rule-strong { border-color:#ededea !important; }
    .track       { background:#2a2a27 !important; }
    .bar         { background:#ededea !important; }
    .bar-blocked { background:#ff9d6b !important; }
  }
</style>
</head>
<body class="page" style="margin:0;padding:0;background:${C.page};font-family:${serif};color:${C.ink}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="page" style="background:${C.page}"><tr><td align="center" class="outer-pad" style="padding:44px 22px">
  <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">

    <tr><td class="rule-strong" style="padding:0 0 22px;border-bottom:2px solid ${C.ink}">
      <div class="mut" style="font-variant:small-caps;letter-spacing:.14em;color:${C.mut};font-size:13px">The daily digest</div>
      <div class="digest-title ink" style="font-size:34px;font-weight:400;color:${C.ink};line-height:1.15;margin-top:8px">${esc(prettyDate)}</div>
      <div class="mut" style="font-style:italic;color:${C.mut};font-size:13px;margin-top:8px">${esc(repo)} · last ${windowHours}h · ${epics.length} open epic${epics.length === 1 ? '' : 's'}</div>
    </td></tr>

    ${actionablesSection(actionables)}

    <tr><td style="padding:34px 0 0">${sectionLabel('Since yesterday')}</td></tr>
    <tr><td style="padding:20px 0 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${statBox((activity.opened || []).length, 'opened', 0)}
        ${statBox((activity.closed || []).length, 'closed', 1)}
        ${statBox((activity.mergedPRs || []).length, 'PRs merged', 1)}
      </tr></table>
    </td></tr>
    <tr><td style="padding:18px 0 0">
      <details>
        <summary class="mut" style="cursor:pointer;font-style:italic;color:${C.mut};font-size:14px;outline:none;list-style:none">a closer look — ${(activity.closed || []).length} closed · ${(activity.mergedPRs || []).length} merged · ${(activity.opened || []).length} opened</summary>
        <div style="margin-top:14px">
          ${detailHead('Closed', '0 0 5px')}
          ${activityList(activity.closed, 'Nothing closed.')}
          ${detailHead('PRs merged')}
          ${activityList(activity.mergedPRs, 'No PRs merged.')}
          ${detailHead('Opened')}
          ${activityList(activity.opened, 'Nothing new opened.')}
        </div>
      </details>
    </td></tr>

    <tr><td style="padding:34px 0 0">${sectionLabel('Open epics')}</td></tr>
    ${epics.length ? epics.map(epicCard).join('') : `<tr><td class="mut" style="font-style:italic;color:${C.mut};font-size:15px;padding:18px 0 0">No open epics. 🎉</td></tr>`}

    ${looseSection(loose)}

    <tr><td class="rule mut" style="padding:24px 0 0;margin-top:34px;border-top:1px solid ${C.border};font-style:italic;color:${C.faint};font-size:12px">
      Gathered ${esc(generated.toISOString())} by the epic-digest skill.
    </td></tr>

  </table>
</td></tr></table>
</body></html>`

// ── plain text ────────────────────────────────────────────────────────────
const line = (it) => `  #${it.number}  ${it.title}\n      ${it.url}`
const txtList = (items, empty, cap = 8) => {
  if (!items || !items.length) return `  (${empty})`
  const shown = items.slice(0, cap).map(line).join('\n')
  const rest = items.length - Math.min(items.length, cap)
  return rest > 0 ? `${shown}\n  … + ${rest} more` : shown
}
const bar = (e) => {
  const p = pct(e)
  const filled = Math.round(p / 5)
  return `[${'#'.repeat(filled)}${'.'.repeat(20 - filled)}] ${e.done}/${e.total}  ${p}%`
}

const txtActionables = (items) => {
  if (!items || !items.length) return ''
  return (
    `NEEDS YOUR EYES — TEST WHAT LANDED (${items.length})\n\n` +
    items
      .map((a) => {
        const isEpic = a.kind === 'epic'
        const badge = a.label || (isEpic ? 'Epic complete · do one QA pass' : 'merged')
        const head = `#${a.number}  ${a.title}  [${badge}]${a.hasVisual ? '  (visual change)' : ''}`
        const steps = (a.testSteps && a.testSteps.length)
          ? a.testSteps.map((s, i) => `    ${i + 1}. ${s}`).join('\n')
          : '    (no test steps — author should add a "How to test" section)'
        const refLabel = isEpic ? `Verify rollup #${a.number}` : `PR #${a.number}`
        const links = `    ${refLabel}: ${a.url}` + (a.previewUrl ? `\n    staging preview: ${a.previewUrl}` : '')
        return `${head}\n  How to test:\n${steps}\n${links}`
      })
      .join('\n\n') +
    `\n\n${'='.repeat(64)}\n\n`
  )
}

const txt =
  `DAILY EPIC DIGEST — ${prettyDate}\n` +
  `${repo} · last ${windowHours}h · ${epics.length} open epic(s)\n` +
  `${'='.repeat(64)}\n\n` +
  txtActionables(actionables) +
  `SINCE YESTERDAY\n` +
  `  ${(activity.opened || []).length} opened · ${(activity.closed || []).length} closed · ${(activity.mergedPRs || []).length} PRs merged\n\n` +
  `Closed:\n${txtList(activity.closed, 'nothing closed')}\n\n` +
  `PRs merged:\n${txtList(activity.mergedPRs, 'none')}\n\n` +
  `Opened:\n${txtList(activity.opened, 'nothing new')}\n\n` +
  `${'='.repeat(64)}\n\nOPEN EPICS\n\n` +
  (epics.length
    ? epics
        .map((e) => {
          const head = `#${e.number}  ${e.title}  [${statusOf(e).label}]`
          const kids = (e.children || [])
            .map((c) => `      ${c.state === 'closed' ? '[x]' : '[ ]'} #${c.number} ${c.title}`)
            .join('\n')
          const theHypothesis = e.theHypothesis || e.theBet || e.whatItIs
          const whereWeAre = e.whereWeAre || e.recentActivity
          return (
            `${head}\n  ${bar(e)}\n` +
            (theHypothesis ? `  Hypothesis:    ${theHypothesis}\n` : '') +
            (e.weWillKnowBy ? `  We'll know by: ${e.weWillKnowBy}\n` : '') +
            (whereWeAre ? `  Where we are:  ${whereWeAre}\n` : '') +
            (kids ? `${kids}\n` : '')
          )
        })
        .join('\n')
    : '  No open epics.\n') +
  (loose.length
    ? `\n${'='.repeat(64)}\n\nLOOSE TICKETS (no epic) — ${loose.length}\n\n` +
      looseGroups(loose)
        .map(
          ([k, rows]) =>
            `${(TYPE_LABEL[k] || k)}:\n` +
            rows.map((it) => `  #${it.number}  ${it.title}\n      ${it.url}`).join('\n')
        )
        .join('\n\n') +
      '\n'
    : '') +
  `\n${'='.repeat(64)}\nGenerated ${generated.toISOString()} by /epic-digest\n`

// ── markdown (for posting as a GitHub issue comment — renders natively) ───────
const mdList = (items, empty, cap = 8) => {
  if (!items || !items.length) return `_${empty}_`
  const shown = items.slice(0, cap).map((it) => `- [#${it.number}](${it.url}) ${it.title}`)
  const rest = items.length - shown.length
  if (rest > 0) shown.push(`- _+ ${rest} more_`)
  return shown.join('\n')
}
const mdEpic = (e) => {
  const theHypothesis = e.theHypothesis || e.theBet || e.whatItIs
  const whereWeAre = e.whereWeAre || e.recentActivity
  const kids = (e.children || [])
    .map((c) => {
      const cs = c.status && c.state !== 'closed' && STATUS[c.status]
      const tag = cs ? ` — _${cs.label}_` : ''
      return `- ${c.state === 'closed' ? '✅' : '⬜'} [#${c.number}](${c.url}) ${c.title}${tag}`
    })
    .join('\n')
  return (
    `#### [#${e.number}](${e.url}) · ${e.title} — \`${e.done}/${e.total} · ${pct(e)}%\` · ${statusOf(e).label}\n` +
    (theHypothesis ? `- **Hypothesis:** ${theHypothesis}\n` : '') +
    (e.weWillKnowBy ? `- **We'll know by:** ${e.weWillKnowBy}\n` : '') +
    (whereWeAre ? `- **Where we are:** ${whereWeAre}\n` : '') +
    (kids ? `<details><summary>Sub-issues (${e.children.length})</summary>\n\n${kids}\n</details>\n` : '')
  )
}
const mdActionables = (items) => {
  if (!items || !items.length) return ''
  // One skimmable line per item (title · badge · 👁 · links); the numbered test
  // steps fold into a tappable <details> so the band reads at a glance on mobile.
  const block = items
    .map((a) => {
      const isEpic = a.kind === 'epic'
      const badge = a.label || (isEpic ? '✓ Epic complete · do one QA pass' : 'merged')
      const visual = a.hasVisual ? ' · 👁' : ''
      const stepCount = (a.testSteps && a.testSteps.length) || 0
      const refLabel = isEpic ? `Verify rollup (#${a.number})` : `PR #${a.number}`
      const links = `[${refLabel}](${a.url})` + (a.previewUrl ? ` · [preview](${a.previewUrl})` : '')
      const meta = stepCount ? `${badge}${visual}` : `${badge}${visual} · ⚠️ no test steps`
      const summary = `**[#${a.number}](${a.url}) · ${a.title}** — _${meta}_ · ${links}`
      if (!stepCount) return summary
      const steps = a.testSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')
      return `${summary}\n<details><summary>🧪 How to test (${stepCount})</summary>\n\n${steps}\n</details>`
    })
    .join('\n\n')
  return (
    `### 🧪 Needs your eyes — test what landed\n` +
    `_${items.length} thing${items.length === 1 ? '' : 's'} shipped in the last ${windowHours}h — open a card to see how to test it._\n\n` +
    block +
    `\n\n`
  )
}

const md =
  `## 📊 Daily epic digest — ${prettyDate}\n` +
  `_${repo} · last ${windowHours}h · ${epics.length} open epic${epics.length === 1 ? '' : 's'}_\n\n` +
  mdActionables(actionables) +
  `**Since yesterday:** ${(activity.opened || []).length} opened · ${(activity.closed || []).length} closed · ${(activity.mergedPRs || []).length} PRs merged\n\n` +
  `<details><summary>Activity detail</summary>\n\n` +
  `**Closed**\n${mdList(activity.closed, 'nothing closed')}\n\n` +
  `**PRs merged**\n${mdList(activity.mergedPRs, 'none')}\n\n` +
  `**Opened**\n${mdList(activity.opened, 'nothing new')}\n</details>\n\n` +
  `### Open epics\n\n` +
  (epics.length ? epics.map(mdEpic).join('\n') : '_No open epics._ 🎉\n') +
  (loose.length
    ? `\n### Loose tickets · no epic\n_${loose.length} open issue${loose.length === 1 ? '' : 's'} not tracked under any epic_\n\n` +
      looseGroups(loose)
        .map(([k, rows]) => `**${TYPE_LABEL[k] || k}**\n` + rows.map((it) => `- [#${it.number}](${it.url}) ${it.title}`).join('\n'))
        .join('\n\n') +
      '\n'
    : '') +
  `\n<sub>Generated ${generated.toISOString()} by the <code>/epic-digest</code> skill.</sub>\n`

// ── write ────────────────────────────────────────────────────────────────────
mkdirSync(resolve(outDir), { recursive: true })
const format = flag('format', 'all')
if (format === 'md') {
  const mdPath = join(outDir, `epic-digest-${stamp}.md`)
  writeFileSync(resolve(mdPath), md)
  console.log(`✓ Markdown → ${mdPath}`)
  console.log(`  ${epics.length} epic(s), ${actionables.length} actionable(s), ${loose.length} loose ticket(s), ${(activity.closed || []).length} closed / ${(activity.mergedPRs || []).length} PRs merged in last ${windowHours}h`)
} else {
  const htmlPath = join(outDir, `epic-digest-${stamp}.html`)
  const txtPath = join(outDir, `epic-digest-${stamp}.txt`)
  writeFileSync(resolve(htmlPath), html)
  writeFileSync(resolve(txtPath), txt)
  console.log(`✓ HTML  → ${htmlPath}`)
  console.log(`✓ Text  → ${txtPath}`)
  console.log(`  ${epics.length} epic(s), ${actionables.length} actionable(s), ${loose.length} loose ticket(s), ${(activity.closed || []).length} closed / ${(activity.mergedPRs || []).length} PRs merged in last ${windowHours}h`)
}
