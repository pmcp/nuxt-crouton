import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'

/**
 * Back-compat alias for the staging review flow (epic #960 / #966).
 *
 * The feedback toolkit moved to @fyit/crouton-feedback, whose `github` sink reads
 * `runtimeConfig.croutonFeedback.github*`. Existing staging deploys still set the
 * credentials as the legacy `NUXT_CROUTON_REVIEW_*` secrets, which Nuxt resolves
 * into the `croutonReview` namespace this module keeps. This plugin copies that
 * legacy namespace into `croutonFeedback` on each request — only when the
 * canonical fields are empty — so old secrets keep the PR-comment flow working
 * unchanged, with no redeploy or secret rename required.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const config = useRuntimeConfig(event) as Record<string, any>
    const review = config.croutonReview
    const fb = config.croutonFeedback
    if (!review || !fb) return

    fb.githubAppId ||= review.githubAppId
    fb.githubAppPrivateKey ||= review.githubAppPrivateKey
    fb.githubAppInstallationId ||= review.githubAppInstallationId
    fb.githubToken ||= review.githubToken
    fb.githubRepository ||= review.repository
    fb.githubPr ||= review.pr

    // If legacy review creds are present, make sure the github sink is selected.
    if ((review.githubAppId || review.githubToken) && (!fb.sink || fb.sink === 'webhook')) {
      fb.sink = 'github'
    }
  })
})
