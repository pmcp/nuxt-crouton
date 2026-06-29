import { defineNuxtModule, createResolver, addImports, addPlugin, addServerHandler } from '@nuxt/kit'
import { createSourceStampTransform } from './runtime/transform/sourceStamp'

/**
 * @fyit/crouton-feedback — in-page feedback toolkit for any Nuxt UI app.
 *
 * Wired: the glasses launcher + tool registry + Console (eruda) tool (#962), the
 * Annotate tool + source-stamp transform + the `/api/_feedback` dispatcher (#963),
 * the four sinks (#964), and the sink-selection config surface below (#965).
 *
 * The module deliberately depends only on Nuxt + Nuxt UI 4 — NOT on
 * @fyit/crouton-core — so any Nuxt UI app can install it.
 */
export interface FeedbackModuleOptions {
  /**
   * Where a sent annotation lands. Server-side only — credentials/URLs never
   * reach the client bundle. Every field is overridable at runtime by its
   * `NUXT_CROUTON_FEEDBACK_*` env var (preferred for secrets).
   */
  feedback?: {
    /** Built-in destination. Default `'webhook'`. (`NUXT_CROUTON_FEEDBACK_SINK`) */
    sink?: 'webhook' | 'slack' | 'discord' | 'github'
    /** `webhook` sink: generic JSON POST target. (`…_WEBHOOK_URL`) */
    webhookUrl?: string
    /** `slack` sink: Slack incoming-webhook URL. (`…_SLACK_URL`) */
    slackUrl?: string
    /** `discord` sink: Discord webhook URL. (`…_DISCORD_URL`) */
    discordUrl?: string
    /** `github` sink: comment as a GitHub App (preferred) or PAT fallback. */
    github?: {
      /** App id. (`…_GITHUB_APP_ID`) */
      appId?: string
      /** App private key PEM — prefer the env var, don't commit it. (`…_GITHUB_APP_PRIVATE_KEY`) */
      privateKey?: string
      /** Installation id. (`…_GITHUB_APP_INSTALLATION_ID`) */
      installationId?: string
      /** Interim PAT, honoured only when App creds are absent. (`…_GITHUB_TOKEN`) */
      token?: string
      /** "owner/repo". (`…_GITHUB_REPOSITORY`) */
      repository?: string
      /** Issue or PR number to comment on. (`…_GITHUB_PR`) */
      pr?: string | number
    }
  }
}

export default defineNuxtModule<FeedbackModuleOptions>({
  meta: {
    name: '@fyit/crouton-feedback',
    configKey: 'croutonFeedback',
    compatibility: {
      nuxt: '^4.0.0'
    }
  },
  defaults: {},
  setup(options, nuxt) {
    // Enabled in local dev or when a build opts in via
    // NUXT_PUBLIC_CROUTON_FEEDBACK=true. The plugins double-check the flag at
    // runtime, so a production build that doesn't set it ships nothing.
    const enabled = nuxt.options.dev || process.env.NUXT_PUBLIC_CROUTON_FEEDBACK === 'true'
    if (!enabled) return

    const resolver = createResolver(import.meta.url)

    // Expose the gate to the client (→ runtimeConfig.public.croutonFeedback),
    // which the plugins re-check before mounting/registering anything.
    nuxt.options.runtimeConfig.public ||= {}
    ;(nuxt.options.runtimeConfig.public as Record<string, unknown>).croutonFeedback = true

    // The registry composable, auto-imported so a tool can register itself.
    addImports({
      name: 'useFeedbackTools',
      from: resolver.resolve('./runtime/composables/useFeedbackTools')
    })

    // Mount the glasses launcher into the host app's <body> context.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/feedback.client'),
      mode: 'client'
    })

    // First registered tool: Console (eruda), lazy-imported on first toggle.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/tools/console.client'),
      mode: 'client'
    })

    // Second tool: Annotate — pin a comment on an element → POST /api/_feedback.
    addPlugin({
      src: resolver.resolve('./runtime/plugins/tools/annotate.client'),
      mode: 'client'
    })

    // Build-time source stamping: inject `data-feedback-src="<relative .vue>"`
    // on each component's root element so a click resolves to the owning file.
    // Runs in the Vue compiler, so it survives `nuxt build` (present in the
    // deployed DOM), unlike Vue DevTools' dev-only inspector attribute.
    nuxt.options.vite ||= {}
    const vite = nuxt.options.vite as Record<string, any>
    vite.vue ||= {}
    vite.vue.template ||= {}
    vite.vue.template.compilerOptions ||= {}
    const compilerOptions = vite.vue.template.compilerOptions
    compilerOptions.nodeTransforms = [
      ...(compilerOptions.nodeTransforms || []),
      createSourceStampTransform(nuxt.options.rootDir)
    ]

    // Server dispatcher config, built from module options. Every field is
    // overridable at runtime by its NUXT_CROUTON_FEEDBACK_* env var — Nuxt only
    // maps env onto keys that already exist here, so the empty-string defaults are
    // load-bearing (they make slack/discord/github reachable from env). These live
    // in SERVER runtimeConfig only — never runtimeConfig.public — so no credential
    // or URL ships in the client bundle.
    const fb = options.feedback ?? {}
    const gh = fb.github ?? {}
    ;(nuxt.options.runtimeConfig as Record<string, any>).croutonFeedback = {
      sink: fb.sink || 'webhook',
      webhookUrl: fb.webhookUrl ?? '',
      slackUrl: fb.slackUrl ?? '',
      discordUrl: fb.discordUrl ?? '',
      githubAppId: gh.appId ?? '',
      githubAppPrivateKey: gh.privateKey ?? '',
      githubAppInstallationId: gh.installationId ?? '',
      githubToken: gh.token ?? '',
      githubRepository: gh.repository ?? '',
      githubPr: gh.pr != null ? String(gh.pr) : ''
    }
    addServerHandler({
      route: '/api/_feedback',
      handler: resolver.resolve('./runtime/server/api/feedback.post'),
      method: 'post'
    })
  }
})
