/**
 * Cron entry point for the repo watchlist runner.
 *
 * Secured by a shared secret in `runtimeConfig.watchReposCronSecret`
 * (env: `WATCH_REPOS_CRON_SECRET`). Pass it as either:
 *   - `Authorization: Bearer <secret>`
 *   - `?secret=<secret>` query parameter
 *
 * Trigger this from a Cloudflare cron trigger or any external scheduler.
 *
 * Optional body:
 *   {
 *     "teamId": "...",      // limit run to one team
 *     "createNodes": true,  // also create idle "watch digest" nodes
 *     "projectId": "..."    // required when createNodes is true
 *   }
 */
import { runWatchRepos } from '~~/server/utils/watch-repos'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const expected = config.watchReposCronSecret as string

  if (!expected) {
    throw createError({
      status: 503,
      statusText: 'WATCH_REPOS_CRON_SECRET is not configured',
    })
  }

  const auth = getHeader(event, 'authorization') ?? ''
  const headerSecret = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : ''
  const querySecret = (getQuery(event).secret as string | undefined) ?? ''
  const provided = headerSecret || querySecret

  if (provided !== expected) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const teamId = typeof body?.teamId === 'string' ? body.teamId : undefined
  const projectId = typeof body?.projectId === 'string' ? body.projectId : undefined
  const createNodes = body?.createNodes === true

  if (createNodes && !projectId) {
    throw createError({ status: 400, statusText: 'projectId is required when createNodes is true' })
  }

  const results = await runWatchRepos({ teamId, projectId, createNodes })

  return {
    runAt: new Date().toISOString(),
    teamId: teamId ?? null,
    createNodes,
    projectId: projectId ?? null,
    results,
  }
})
