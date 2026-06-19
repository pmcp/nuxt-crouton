#!/usr/bin/env node
/**
 * Deterministic data-gather for the epic digest — no LLM, no deps.
 *
 *   GITHUB_TOKEN=... node gather.mjs > digest.data.json
 *
 * Pulls the open-epic tree, the last-24h activity band, and the loose
 * (unparented) tickets straight from the GitHub REST API, parses each epic's
 * "The bet" / "We'll know by" out of its body, computes a plain "Where we are"
 * from the child counts, and emits the exact JSON shape render.mjs consumes.
 *
 * This is the engine behind the scheduled daily run (.github/workflows/epic-digest.yml).
 * The interactive /epic-digest skill gathers via GitHub MCP instead; both feed render.mjs.
 *
 * Env:
 *   GITHUB_TOKEN          (required) repo-scoped token; the Action passes the built-in one
 *   DIGEST_REPO           default "pmcp/nuxt-crouton"
 *   DIGEST_WINDOW_HOURS   default 24
 */

const REPO = process.env.DIGEST_REPO || 'pmcp/nuxt-crouton'
const [OWNER, NAME] = REPO.split('/')
const windowHours = Number(process.env.DIGEST_WINDOW_HOURS || 24)
const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('gather.mjs: GITHUB_TOKEN is required')
  process.exit(1)
}

const cutoffMs = Date.now() - windowHours * 3600 * 1000
const cutoff = new Date(cutoffMs).toISOString().slice(0, 10) // YYYY-MM-DD

// The digest posts to its own standing issue — don't let it list itself.
const STANDING_TITLE = process.env.DIGEST_ISSUE_TITLE || '📊 Daily epic digest'
const notStanding = (i) => i.title !== STANDING_TITLE

async function gh(path) {
  const res = await fetch('https://api.github.com' + path, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'epic-digest'
    }
  })
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${await res.text()}`)
  return res.json()
}
const search = async (q) =>
  (await gh(`/search/issues?per_page=100&q=${encodeURIComponent(q)}`)).items || []
const slim = (it, kind) => ({
  number: it.number,
  title: it.title,
  url: it.html_url || `https://github.com/${REPO}/issues/${it.number}`,
  kind
})

// ── body parsing (deterministic) ────────────────────────────────────────────
function section(body, re) {
  if (!body) return ''
  const lines = body.split(/\r?\n/)
  const i = lines.findIndex((l) => re.test(l))
  if (i < 0) return ''
  const out = []
  for (let j = i + 1; j < lines.length; j++) {
    if (/^##\s/.test(lines[j])) break
    out.push(lines[j])
  }
  return out.join('\n').trim()
}
const firstSentence = (s) => {
  s = String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
  const m = s.match(/^(.*?[.!?])(\s|$)/)
  return (m ? m[1] : s).trim()
}
function parseBet(body) {
  const sec = section(body, /^##\s.*bet/i)
  if (!sec) return ''
  const flat = sec.replace(/\*\*/g, '')
  const m = flat.match(/We think that[\s\S]*?(?:that'?s what we want\.?|that is what we want\.?)/i)
  return (m ? m[0] : firstSentence(sec)).replace(/\s+/g, ' ').trim()
}
function parseKnowBy(body) {
  if (!body) return ''
  const m = body.replace(/\*\*/g, '').match(/We'?ll know by[^\n]*/i)
  if (!m) return ''
  return m[0].replace(/^.*?We'?ll know by[:\s—-]*/i, '').replace(/\s+/g, ' ').trim()
}
const labelNames = (it) => (it.labels || []).map((l) => (typeof l === 'string' ? l : l.name))
const statusOfLabels = (names) =>
  names.includes('status:blocked') ? 'blocked'
  : names.includes('status:in-progress') ? 'in-progress'
  : undefined
const typeOfLabels = (names) => (names.find((n) => n.startsWith('type:')) || '').replace(/^type:/, '')

async function subIssues(number) {
  try {
    return await gh(`/repos/${OWNER}/${NAME}/issues/${number}/sub_issues?per_page=100`)
  } catch {
    return [] // sub-issues API unavailable / none
  }
}

// ── gather ───────────────────────────────────────────────────────────────────
const childNumbers = new Set()

const epicItems = await search(`repo:${REPO} is:issue is:open label:epic`)
const epics = []
for (const e of epicItems) {
  const kids = await subIssues(e.number)
  let done = 0, anyBlocked = false, inProgress = 0, closedInWindow = 0
  const children = kids.map((c) => {
    childNumbers.add(c.number)
    const names = labelNames(c)
    const status = statusOfLabels(names)
    if (c.state === 'closed') {
      done++
      if (c.closed_at && Date.parse(c.closed_at) >= cutoffMs) closedInWindow++
    }
    if (status === 'blocked') anyBlocked = true
    if (status === 'in-progress') inProgress++
    return { number: c.number, title: c.title, url: c.html_url, state: c.state, ...(status ? { status } : {}) }
  })
  const total = children.length
  const epicNames = labelNames(e)
  const blocked = anyBlocked || epicNames.includes('status:blocked')

  const parts = [`${done}/${total} done`]
  if (blocked) parts.push('blocked')
  else if (inProgress) parts.push(`${inProgress} in progress`)
  if (closedInWindow) parts.push(`${closedInWindow} closed in last ${windowHours}h`)
  const whereWeAre = parts.join(' · ')

  const status = blocked ? 'blocked' : (total > 0 && done >= total) ? 'done' : inProgress ? 'in-progress' : 'open'

  epics.push({
    number: e.number, title: e.title, url: e.html_url,
    status, blocked, total, done,
    theBet: parseBet(e.body),
    weWillKnowBy: parseKnowBy(e.body),
    whereWeAre,
    children
  })
}

const [closed, opened, mergedPRs, openNonEpic] = await Promise.all([
  search(`repo:${REPO} is:issue is:closed closed:>=${cutoff}`),
  search(`repo:${REPO} is:issue created:>=${cutoff}`),
  search(`repo:${REPO} is:pr is:merged merged:>=${cutoff}`),
  search(`repo:${REPO} is:issue is:open -label:epic`)
])

const loose = openNonEpic
  .filter((i) => !i.parent_issue_url && !childNumbers.has(i.number) && notStanding(i))
  .map((i) => ({ number: i.number, title: i.title, url: i.html_url, type: typeOfLabels(labelNames(i)) || 'other' }))

const data = {
  generatedAt: new Date().toISOString(),
  windowHours,
  repo: REPO,
  activity: {
    opened: opened.filter(notStanding).map((i) => slim(i, 'issue')),
    closed: closed.filter(notStanding).map((i) => slim(i, 'issue')),
    mergedPRs: mergedPRs.map((i) => slim(i, 'pr'))
  },
  epics,
  loose
}

process.stdout.write(JSON.stringify(data, null, 2) + '\n')
