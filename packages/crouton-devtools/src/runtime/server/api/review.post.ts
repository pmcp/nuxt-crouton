import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { formatReviewComment, type ReviewAnnotation } from '../../overlay/capture'

/**
 * Preview-review GitHub bridge (epic #488, #491).
 *
 * Receives a `ReviewAnnotation` from the in-page overlay (#489) and posts it as a
 * comment on the PR, so the agent — already subscribed via `subscribe_pr_activity`
 * — wakes and can act on it. Registered (staging-only) by the module under the
 * `NUXT_PUBLIC_CROUTON_REVIEW` gate; never present in a production build.
 *
 * Config comes from server runtimeConfig (`croutonReview`), populated at runtime
 * from Worker env so the token never ships in the bundle or reaches the client:
 *   - NUXT_CROUTON_REVIEW_GITHUB_TOKEN  → githubToken (Worker secret)
 *   - NUXT_CROUTON_REVIEW_REPOSITORY    → repository ("owner/repo")
 *   - NUXT_CROUTON_REVIEW_PR            → pr (the staging PR number)
 * The PR number may also be supplied per-request via `prNumber` in the body.
 *
 * ⚠️ DIRECTION (epic #519): this PAT in `githubToken` is INTERIM. The bridge is
 * workstream #2 of the Crouton GitHub App — it will mint a short-lived installation
 * token via `@octokit/auth-app` and post as `crouton[bot]` instead of a standalone
 * PAT. `repository`/`pr` (routing, not secrets) stay. See #519 and
 * `writeups/setup/secrets-and-tokens.md`.
 *
 * Returns `{ data, error }`; on failure `error` is a safe message that never
 * echoes the token.
 */
interface ReviewBody extends Partial<ReviewAnnotation> {
  prNumber?: number | string
}

export default defineEventHandler(async (event) => {
  // Cast at the boundary: the monorepo resolves two h3 versions, so the H3Event
  // from defineEventHandler isn't nominally identical to the one useRuntimeConfig
  // expects. Pass the event (needed for per-request env on Workers).
  const config = useRuntimeConfig(event as Parameters<typeof useRuntimeConfig>[0])
  const review = (config.croutonReview || {}) as {
    githubToken?: string
    repository?: string
    pr?: string
  }

  let body: ReviewBody
  try {
    body = await readBody<ReviewBody>(event)
  }
  catch {
    return { data: null, error: 'Invalid request body' }
  }

  if (!body?.commentText || !body?.route || !body?.cssSelector) {
    return { data: null, error: 'Missing required fields (commentText, route, cssSelector)' }
  }

  const token = review.githubToken
  const repository = review.repository
  const pr = String(body.prNumber ?? review.pr ?? '').trim()

  if (!token || !repository || !pr) {
    return {
      data: null,
      error: 'Review bridge not configured: set NUXT_CROUTON_REVIEW_GITHUB_TOKEN + '
        + 'NUXT_CROUTON_REVIEW_REPOSITORY and provide a PR number '
        + '(NUXT_CROUTON_REVIEW_PR or body.prNumber).'
    }
  }

  const markdown = formatReviewComment(body as ReviewAnnotation)

  try {
    const res = await $fetch<{ html_url: string }>(
      `https://api.github.com/repos/${repository}/issues/${pr}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'crouton-review'
        },
        body: { body: markdown }
      }
    )
    return { data: { ok: true, commentUrl: res.html_url }, error: null }
  }
  catch (err) {
    // Never leak the token — surface only a status-coded, safe message.
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
      ?? (err as { statusCode?: number })?.statusCode
    return { data: null, error: `GitHub API request failed${status ? ` (${status})` : ''}` }
  }
})
