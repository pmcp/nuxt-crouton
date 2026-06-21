import { defineEventHandler, readBody } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { formatReviewComment, type ReviewAnnotation } from '../../overlay/capture'
import { mintInstallationToken } from '../utils/githubApp'

/**
 * Preview-review GitHub bridge (epic #488, #491).
 *
 * Receives a `ReviewAnnotation` from the in-page overlay (#489) and posts it as a
 * comment on the PR, so the agent — already subscribed via `subscribe_pr_activity`
 * — wakes and can act on it. Registered (staging-only) by the module under the
 * `NUXT_PUBLIC_CROUTON_REVIEW` gate; never present in a production build.
 *
 * Config comes from server runtimeConfig (`croutonReview`), populated at runtime
 * from Worker env so no credential ships in the bundle or reaches the client.
 *
 * AUTH (epic #519): the bridge posts as the shared **Crouton GitHub App**
 * (`crouton[bot]`) by minting a short-lived installation token just-in-time — no
 * stored PAT, no person-impersonation. Set the App credentials as Worker secrets:
 *   - NUXT_CROUTON_REVIEW_GITHUB_APP_ID              → githubAppId
 *   - NUXT_CROUTON_REVIEW_GITHUB_APP_PRIVATE_KEY     → githubAppPrivateKey (the secret)
 *   - NUXT_CROUTON_REVIEW_GITHUB_APP_INSTALLATION_ID → githubAppInstallationId
 * Routing (not secrets):
 *   - NUXT_CROUTON_REVIEW_REPOSITORY → repository ("owner/repo")
 *   - NUXT_CROUTON_REVIEW_PR         → pr (the staging PR number; or body.prNumber)
 *
 * INTERIM FALLBACK: `NUXT_CROUTON_REVIEW_GITHUB_TOKEN` (a standalone PAT) is still
 * honoured *only* when App credentials are absent — a dev/throwaway stopgap, never
 * production. App credentials take precedence. See `writeups/setup/secrets-and-tokens.md`.
 *
 * Returns `{ data, error }`; on failure `error` is a safe message that never echoes
 * a token or the private key.
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
    githubAppId?: string
    githubAppPrivateKey?: string
    githubAppInstallationId?: string
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

  const repository = review.repository
  const pr = String(body.prNumber ?? review.pr ?? '').trim()

  const hasApp = !!(review.githubAppId && review.githubAppPrivateKey && review.githubAppInstallationId)
  const hasPat = !!review.githubToken

  if ((!hasApp && !hasPat) || !repository || !pr) {
    return {
      data: null,
      error: 'Review bridge not configured: set the Crouton App credentials '
        + '(NUXT_CROUTON_REVIEW_GITHUB_APP_ID / _PRIVATE_KEY / _INSTALLATION_ID) '
        + 'or the interim NUXT_CROUTON_REVIEW_GITHUB_TOKEN, plus '
        + 'NUXT_CROUTON_REVIEW_REPOSITORY and a PR number '
        + '(NUXT_CROUTON_REVIEW_PR or body.prNumber).'
    }
  }

  // Prefer a short-lived App installation token (#519); fall back to the interim PAT.
  let token: string
  try {
    token = hasApp
      ? await mintInstallationToken({
          appId: review.githubAppId!,
          privateKey: review.githubAppPrivateKey!,
          installationId: review.githubAppInstallationId!
        })
      : review.githubToken!
  }
  catch {
    // Minting failed (bad key / installation) — never surface the key or JWT.
    return { data: null, error: 'Failed to authenticate as the Crouton GitHub App' }
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
