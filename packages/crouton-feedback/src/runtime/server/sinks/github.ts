import type { FeedbackSink } from './types'
import { mintInstallationToken } from '../utils/githubApp'

/**
 * The **github** sink — post the annotation Markdown as a comment on a GitHub
 * issue or PR (the `…/issues/{number}/comments` endpoint serves both).
 *
 * Auth prefers a short-lived **App installation token** (minted just-in-time from
 * the App credentials, no stored PAT); an interim `githubToken` PAT is honoured
 * only when App credentials are absent. Config (server-side `runtimeConfig`):
 *   - githubAppId / githubAppPrivateKey / githubAppInstallationId  (the App)
 *   - githubToken                                                  (interim PAT)
 *   - repository ("owner/repo") + pr (issue/PR number)
 *
 * Ported from the @fyit/crouton-devtools review bridge (#491/#519). Returns a safe
 * message on failure — never echoes a token or the private key.
 */
export const githubSink: FeedbackSink = async (_annotation, markdown, { config }) => {
  const repository = typeof config.repository === 'string' ? config.repository.trim() : ''
  const pr = String(config.pr ?? '').trim()
  const appId = config.githubAppId as string | undefined
  const privateKey = config.githubAppPrivateKey as string | undefined
  const installationId = config.githubAppInstallationId as string | undefined
  const githubToken = config.githubToken as string | undefined

  const hasApp = !!(appId && privateKey && installationId)
  const hasPat = !!githubToken

  if ((!hasApp && !hasPat) || !repository || !pr) {
    return {
      ok: false,
      error: 'GitHub sink not configured: set the App credentials '
        + '(NUXT_CROUTON_FEEDBACK_GITHUB_APP_ID / _PRIVATE_KEY / _INSTALLATION_ID) '
        + 'or the interim NUXT_CROUTON_FEEDBACK_GITHUB_TOKEN, plus '
        + 'NUXT_CROUTON_FEEDBACK_GITHUB_REPOSITORY and _GITHUB_PR.'
    }
  }

  // Prefer a short-lived App installation token; fall back to the interim PAT.
  let token: string
  try {
    token = hasApp
      ? await mintInstallationToken({ appId: appId!, privateKey: privateKey!, installationId: installationId! })
      : githubToken!
  }
  catch {
    return { ok: false, error: 'Failed to authenticate as the GitHub App' }
  }

  try {
    const res = await $fetch<{ html_url: string }>(
      `https://api.github.com/repos/${repository}/issues/${pr}/comments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'crouton-feedback'
        },
        body: { body: markdown }
      }
    )
    return { ok: true, data: { commentUrl: res.html_url } }
  }
  catch (err) {
    const status = (err as { response?: { status?: number }, statusCode?: number })?.response?.status
      ?? (err as { statusCode?: number })?.statusCode
    return { ok: false, error: `GitHub API request failed${status ? ` (${status})` : ''}` }
  }
}
