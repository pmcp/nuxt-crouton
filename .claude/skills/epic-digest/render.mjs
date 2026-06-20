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

const STATUS = {
  blocked: { label: 'Blocked', bg: '#fef2f2', fg: '#b91c1c', bar: '#ef4444' },
  'in-progress': { label: 'In progress', bg: '#fffbeb', fg: '#b45309', bar: '#f59e0b' },
  done: { label: 'Done', bg: '#ecfdf5', fg: '#047857', bar: '#10b981' },
  open: { label: 'Open', bg: '#f1f5f9', fg: '#475569', bar: '#10b981' }
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
const card = 'background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;'
const muted = 'color:#64748b;'

function actionableCard(a) {
  const isEpic = a.kind === 'epic'
  const badge = a.label || (isEpic ? '✓ Epic complete · do one QA pass' : 'merged')
  const badgeStyle = isEpic ? 'background:#ecfdf5;color:#047857' : 'background:#f1f5f9;color:#475569'
  const accent = isEpic ? 'border-left:4px solid #10b981;' : ''
  const visual = a.hasVisual
    ? `<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:#eef2ff;color:#4338ca">👁 visual change</span> `
    : ''
  const steps = (a.testSteps && a.testSteps.length)
    ? `<ol style="margin:0;padding-left:18px;color:#334155;font-size:13px;line-height:1.7">${a.testSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`
    : `<div style="${muted}font-size:12px;font-style:italic">No test steps — author should add a “🧪 How to test” section.</div>`
  const links = [
    `<a href="${esc(a.url)}" style="color:#0f766e;text-decoration:none">→ ${isEpic ? `Verify rollup (#${esc(a.number)})` : `PR #${esc(a.number)}`}</a>`
  ]
  if (a.previewUrl) links.push(`<a href="${esc(a.previewUrl)}" style="color:#0f766e;text-decoration:none">staging preview</a>`)
  return `
  <tr><td style="padding:0 0 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${card}${accent}"><tr><td style="padding:16px 18px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:15px;font-weight:600">
          <a href="${esc(a.url)}" style="color:#0f172a;text-decoration:none">#${esc(a.number)} · ${esc(a.title)}</a>
        </td>
        <td align="right" style="white-space:nowrap">${visual}<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;${badgeStyle}">${esc(badge)}</span></td>
      </tr></table>
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px 14px;margin-top:12px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#b45309;margin-bottom:6px">🧪 How to test</div>
        ${steps}
      </div>
      <div style="margin-top:10px;font-size:12px">${links.join(' · ')}</div>
    </td></tr></table>
  </td></tr>`
}

function actionablesSection(items) {
  if (!items || !items.length) return ''
  return `
    <tr><td style="padding:0 0 10px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#b45309">🧪 Needs your eyes — test what landed</div>
      <div style="${muted}font-size:13px;margin-top:4px">${items.length} thing${items.length === 1 ? '' : 's'} shipped in the last ${windowHours}h, ready for you to click through and sign off on.</div>
    </td></tr>
    ${items.map(actionableCard).join('')}`
}

const ACTIVITY_CAP = 8
function activityList(items, emptyText, cap = ACTIVITY_CAP) {
  if (!items || !items.length) return `<div style="${muted}font-size:13px;margin:2px 0 0">${emptyText}</div>`
  const shown = items.slice(0, cap)
  const rest = items.length - shown.length
  const rows = shown
    .map(
      (it) =>
        `<div style="font-size:13px;line-height:1.6;margin:1px 0">` +
        `<a href="${esc(it.url)}" style="color:#0f766e;text-decoration:none">#${esc(it.number)}</a> ` +
        `<span style="color:#334155">${esc(it.title)}</span></div>`
    )
    .join('')
  const more = rest > 0
    ? `<div style="${muted}font-size:12px;margin:3px 0 0;font-style:italic">+ ${rest} more</div>`
    : ''
  return rows + more
}

function statBox(n, label, color) {
  return (
    `<td align="center" style="padding:10px 4px;${card}">` +
    `<div style="font-size:26px;font-weight:700;color:${color};line-height:1">${n}</div>` +
    `<div style="${muted}font-size:11px;text-transform:uppercase;letter-spacing:.04em;margin-top:4px">${label}</div>` +
    `</td>`
  )
}

function labeledLine(label, text) {
  if (!text) return ''
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px"><tr>` +
    `<td valign="top" style="width:104px;padding-right:10px;${muted}font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;line-height:1.55;white-space:nowrap">${label}</td>` +
    `<td valign="top" style="color:#334155;font-size:13px;line-height:1.55">${esc(text)}</td>` +
    `</tr></table>`
  )
}

function epicCard(e) {
  const s = statusOf(e)
  const p = pct(e)
  const children = e.children || []
  const childRows = children
    .map((c) => {
      const closed = c.state === 'closed'
      const mark = closed ? '✓' : '○'
      const markColor = closed ? '#10b981' : '#94a3b8'
      const titleStyle = closed ? 'color:#94a3b8;text-decoration:line-through' : 'color:#334155'
      const cs = c.status && STATUS[c.status]
      const tag = cs && !closed
        ? ` <span style="font-size:10px;padding:1px 6px;border-radius:8px;background:${cs.bg};color:${cs.fg}">${cs.label}</span>`
        : ''
      return (
        `<div style="font-size:13px;line-height:1.7;padding:2px 0">` +
        `<span style="color:${markColor};font-weight:700">${mark}</span> ` +
        `<a href="${esc(c.url)}" style="color:#0f766e;text-decoration:none">#${esc(c.number)}</a> ` +
        `<span style="${titleStyle}">${esc(c.title)}</span>${tag}</div>`
      )
    })
    .join('')

  return `
  <tr><td style="padding:0 0 14px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${card}">
      <tr><td style="padding:16px 18px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:15px;font-weight:600">
            <a href="${esc(e.url)}" style="color:#0f172a;text-decoration:none">#${esc(e.number)} · ${esc(e.title)}</a>
          </td>
          <td align="right" style="white-space:nowrap">
            <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${s.bg};color:${s.fg}">${s.label}</span>
          </td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px"><tr>
          <td style="width:100%;padding-right:12px">
            <div style="background:#e2e8f0;border-radius:6px;height:8px;width:100%">
              <div style="background:${s.bar};border-radius:6px;height:8px;width:${p}%"></div>
            </div>
          </td>
          <td style="white-space:nowrap;${muted}font-size:12px;font-weight:600">${e.done}/${e.total} · ${p}%</td>
        </tr></table>

        ${labeledLine('Hypothesis', e.theHypothesis || e.theBet || e.whatItIs)}
        ${labeledLine("We'll know by", e.weWillKnowBy)}
        ${labeledLine('Where we are', e.whereWeAre || e.recentActivity)}

        ${
          children.length
            ? `<details style="margin-top:10px">
                 <summary style="cursor:pointer;color:#0f766e;font-size:12px;font-weight:600;outline:none">Sub-issues (${children.length})</summary>
                 <div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9">${childRows}</div>
               </details>`
            : ''
        }
      </td></tr>
    </table>
  </td></tr>`
}

function looseSection(items) {
  if (!items || !items.length) return ''
  const blocks = looseGroups(items)
    .map(([k, rows]) => {
      const lines = rows
        .map(
          (it) =>
            `<div style="font-size:13px;line-height:1.6;margin:1px 0">` +
            `<a href="${esc(it.url)}" style="color:#0f766e;text-decoration:none">#${esc(it.number)}</a> ` +
            `<span style="color:#334155">${esc(it.title)}</span></div>`
        )
        .join('')
      return `<div style="font-size:12px;font-weight:600;color:#0f172a;margin:10px 0 2px">${esc(TYPE_LABEL[k] || k)}</div>${lines}`
    })
    .join('')
  return `
    <tr><td style="padding:6px 0 10px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;${muted}">Loose tickets · no epic</div>
    </td></tr>
    <tr><td style="padding:0 0 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${card}"><tr><td style="padding:14px 18px">
        <div style="${muted}font-size:12px;margin:0 0 2px">${items.length} open issue${items.length === 1 ? '' : 's'} not tracked under any epic</div>
        ${blocks}
      </td></tr></table>
    </td></tr>`
}

const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Epic digest · ${esc(prettyDate)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc"><tr><td align="center" style="padding:28px 16px">
  <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%">

    <tr><td style="padding:0 0 20px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0f766e">Daily Epic Digest</div>
      <div style="font-size:22px;font-weight:700;margin-top:4px">${esc(prettyDate)}</div>
      <div style="${muted}font-size:13px;margin-top:2px">${esc(repo)} · last ${windowHours}h · ${epics.length} open epic${epics.length === 1 ? '' : 's'}</div>
    </td></tr>

    ${actionablesSection(actionables)}

    <tr><td style="padding:0 0 22px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;${muted}margin:0 0 10px">Since yesterday</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="8" style="margin:-8px"><tr>
        ${statBox((activity.opened || []).length, 'Opened', '#0f172a')}
        ${statBox((activity.closed || []).length, 'Closed', '#047857')}
        ${statBox((activity.mergedPRs || []).length, 'PRs merged', '#7c3aed')}
      </tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;${card}"><tr><td style="padding:14px 18px">
        <details>
          <summary style="cursor:pointer;color:#0f766e;font-size:12px;font-weight:600;outline:none;list-style:none">Show detail — ${(activity.closed || []).length} closed · ${(activity.mergedPRs || []).length} merged · ${(activity.opened || []).length} opened</summary>
          <div style="margin-top:10px">
            <div style="font-size:12px;font-weight:600;color:#047857;margin-bottom:2px">Closed</div>
            ${activityList(activity.closed, 'Nothing closed.')}
            <div style="font-size:12px;font-weight:600;color:#7c3aed;margin:12px 0 2px">PRs merged</div>
            ${activityList(activity.mergedPRs, 'No PRs merged.')}
            <div style="font-size:12px;font-weight:600;color:#0f172a;margin:12px 0 2px">Opened</div>
            ${activityList(activity.opened, 'Nothing new opened.')}
          </div>
        </details>
      </td></tr></table>
    </td></tr>

    <tr><td style="padding:0 0 10px">
      <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;${muted}">Open epics</div>
    </td></tr>
    ${epics.length ? epics.map(epicCard).join('') : `<tr><td style="${muted}font-size:14px;padding:0 0 14px">No open epics. 🎉</td></tr>`}

    ${looseSection(loose)}

    <tr><td style="padding:10px 0 0;border-top:1px solid #e2e8f0;${muted}font-size:12px">
      Generated ${esc(generated.toISOString())} by the <code>/epic-digest</code> skill.
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
  const block = items
    .map((a) => {
      const isEpic = a.kind === 'epic'
      const badge = a.label || (isEpic ? '✓ Epic complete · do one QA pass' : 'merged')
      const visual = a.hasVisual ? ' · 👁 visual change' : ''
      const steps = (a.testSteps && a.testSteps.length)
        ? a.testSteps.map((s, i) => `   ${i + 1}. ${s}`).join('\n')
        : `   _No test steps — author should add a “🧪 How to test” section._`
      const refLabel = isEpic ? `Verify rollup (#${a.number})` : `PR #${a.number}`
      const links = `   → [${refLabel}](${a.url})` + (a.previewUrl ? ` · [staging preview](${a.previewUrl})` : '')
      return `- **[#${a.number}](${a.url}) · ${a.title}** — _${badge}${visual}_\n   **🧪 How to test:**\n${steps}\n${links}`
    })
    .join('\n')
  return (
    `### 🧪 Needs your eyes — test what landed\n` +
    `_${items.length} thing${items.length === 1 ? '' : 's'} shipped in the last ${windowHours}h, ready to click through and sign off on._\n\n` +
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
