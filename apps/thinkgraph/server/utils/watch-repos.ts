/**
 * Repo watchlist runner.
 *
 * For each active `thinkgraph_watchedrepos` row, fetches commits since
 * `lastCheckedSha` from the GitHub API, generates a markdown digest with
 * the project's standard AI helper, writes a `thinkgraph_watchreports` row,
 * and (optionally) creates an idle "watch digest" node so the digest shows
 * up on the canvas.
 *
 * Replaces the cron-driven `apps/docs/scripts/sync-changelogs.ts` flow:
 * the same GitHub-API + AI-summary loop, but state lives in D1 instead of
 * a JSON file in apps/docs, and digests can be promoted into nodes.
 *
 * Designed to be invoked from a cron-style endpoint — see
 * `server/api/cron/watch-repos.post.ts`.
 */
import { and, eq } from 'drizzle-orm'
import { generateText } from 'ai'
import { thinkgraphWatchedRepos } from '~~/layers/thinkgraph/collections/watchedrepos/server/database/schema'
import {
  createThinkgraphWatchReport,
  updateThinkgraphWatchReport,
} from '~~/layers/thinkgraph/collections/watchreports/server/database/queries'
import { createThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

const SYSTEM_OWNER = 'system'
const MAX_COMMITS_PER_RUN = 30

export interface GithubCommit {
  sha: string
  message: string
  author: string | null
  date: string | null
  url: string
}

export interface WatchRunResult {
  repoId: string
  repo: string
  commitsFetched: number
  reportId: string | null
  nodeId: string | null
  newSha: string | null
  skipped: boolean
  reason?: string
  error?: string
}

interface RunOptions {
  /** If true, also create an idle node tagged as a "watch digest" for each report. */
  createNodes?: boolean
  /** Project to attach created nodes to. Required when createNodes is true. */
  projectId?: string
  /** Limit to a single team. If omitted, runs across all teams that have active watched repos. */
  teamId?: string
}

interface GithubCommitApi {
  sha: string
  html_url: string
  commit: {
    message: string
    author?: { name?: string; date?: string } | null
  }
}

/**
 * Fetch commits from GitHub since a given SHA.
 * If `sinceSha` is empty, fetches the most recent page (treated as a "first run").
 */
async function fetchCommitsSince(
  repo: string,
  branch: string,
  sinceSha: string | null,
  token: string,
): Promise<GithubCommit[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) headers.Authorization = `Bearer ${token}`

  // GitHub returns commits newest-first. We page until we hit `sinceSha` or the cap.
  const collected: GithubCommitApi[] = []
  let page = 1
  const perPage = Math.min(MAX_COMMITS_PER_RUN, 30)

  while (collected.length < MAX_COMMITS_PER_RUN) {
    const url = `https://api.github.com/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${perPage}&page=${page}`
    const batch = await $fetch<GithubCommitApi[]>(url, { headers })
    if (!Array.isArray(batch) || batch.length === 0) break

    let stop = false
    for (const c of batch) {
      if (sinceSha && c.sha === sinceSha) {
        stop = true
        break
      }
      collected.push(c)
      if (collected.length >= MAX_COMMITS_PER_RUN) {
        stop = true
        break
      }
    }
    if (stop || batch.length < perPage) break
    page += 1
  }

  return collected.map(c => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name ?? null,
    date: c.commit.author?.date ?? null,
    url: c.html_url,
  }))
}

const SUMMARY_PROMPT = `You are summarizing recent commits to a software repository for a developer who hasn't checked in.

Produce a short markdown digest with these sections (skip empty ones):

## Highlights
2-4 bullets covering the most important changes — features shipped, bugs fixed, breaking changes, anything that affects how the project is used.

## Activity
One sentence: "{N} commits across {areas}." Identify rough areas from commit messages (auth, ui, api, deps, etc).

## Worth a closer look
0-2 bullets pointing at specific commits (by short message + sha) the reader should probably read in full.

Be terse. No filler. No "this digest summarizes...". If the commits are all chores/deps/typo fixes, say so plainly.`

async function generateDigest(repo: string, commits: GithubCommit[]): Promise<string> {
  if (commits.length === 0) return ''

  const commitList = commits
    .map(c => `- ${c.sha.slice(0, 7)} ${c.message.split('\n')[0]}`)
    .join('\n')

  try {
    const ai = createAIProvider()
    const { text } = await generateText({
      model: ai.model('claude-haiku-4-5-20251001'),
      maxTokens: 500,
      messages: [
        {
          role: 'user',
          content: `${SUMMARY_PROMPT}\n\nRepository: ${repo}\nCommits (newest first):\n${commitList}`,
        },
      ],
    })
    return text.trim()
  }
  catch (err) {
    console.error(`[watch-repos] AI digest failed for ${repo}:`, err instanceof Error ? err.message : err)
    return `## Activity\n${commits.length} new commits since last check. AI summary unavailable.\n\n${commitList}`
  }
}

/**
 * Runs the watcher for all active watched_repos rows (optionally filtered by team).
 */
export async function runWatchRepos(options: RunOptions = {}): Promise<WatchRunResult[]> {
  const config = useRuntimeConfig()
  const token = (config.githubToken as string | undefined) ?? ''
  if (!token) {
    console.warn('[watch-repos] No GITHUB_TOKEN set — running unauthenticated, low rate limits apply.')
  }

  const db = useDB()
  const where = options.teamId
    ? and(eq(thinkgraphWatchedRepos.active, true), eq(thinkgraphWatchedRepos.teamId, options.teamId))
    : eq(thinkgraphWatchedRepos.active, true)

  const rows = await (db as any)
    .select()
    .from(thinkgraphWatchedRepos)
    .where(where)

  const results: WatchRunResult[] = []

  for (const row of rows) {
    const branch = row.branch || 'main'
    const result: WatchRunResult = {
      repoId: row.id,
      repo: row.repo,
      commitsFetched: 0,
      reportId: null,
      nodeId: null,
      newSha: row.lastCheckedSha ?? null,
      skipped: false,
    }

    try {
      const commits = await fetchCommitsSince(row.repo, branch, row.lastCheckedSha, token)
      result.commitsFetched = commits.length

      if (commits.length === 0) {
        result.skipped = true
        result.reason = 'no new commits'
        results.push(result)
        continue
      }

      const summary = await generateDigest(row.repo, commits)
      const newSha = commits[0]!.sha

      const report = await createThinkgraphWatchReport({
        teamId: row.teamId,
        owner: row.owner ?? SYSTEM_OWNER,
        repoId: row.id,
        runDate: new Date().toISOString(),
        summary,
        commitsSinceLast: commits as any,
        createdNodeIds: [] as any,
      } as any)

      result.reportId = report?.id ?? null

      // Optionally create an idle node so the digest surfaces on the canvas.
      if (options.createNodes && options.projectId) {
        const node = await createThinkgraphNode({
          teamId: row.teamId,
          owner: row.owner ?? SYSTEM_OWNER,
          projectId: options.projectId,
          template: 'research',
          title: `Watch digest: ${row.repo} (${commits.length} commit${commits.length === 1 ? '' : 's'})`,
          summary: `New activity in ${row.repo} since last check.`,
          brief: summary,
          status: 'idle',
          origin: 'mcp',
          assignee: 'human',
          artifacts: { kind: 'watch-digest', repoId: row.id, reportId: report?.id, repo: row.repo } as any,
        } as any)

        result.nodeId = node?.id ?? null

        if (report?.id && node?.id) {
          try {
            await updateThinkgraphWatchReport(
              report.id,
              row.teamId,
              row.owner ?? SYSTEM_OWNER,
              { createdNodeIds: [node.id] as any },
              { role: 'admin' },
            )
          }
          catch (err) {
            console.error('[watch-repos] Failed to backfill createdNodeIds:', err instanceof Error ? err.message : err)
          }
        }
      }

      // Update lastCheckedSha on the watched_repo row.
      await (db as any)
        .update(thinkgraphWatchedRepos)
        .set({ lastCheckedSha: newSha })
        .where(eq(thinkgraphWatchedRepos.id, row.id))

      result.newSha = newSha
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[watch-repos] ${row.repo} failed:`, message)
      result.error = message
    }

    results.push(result)
  }

  return results
}
