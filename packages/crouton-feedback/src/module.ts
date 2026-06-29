import { defineNuxtModule, createResolver, addImports, addPlugin } from '@nuxt/kit'

/**
 * @fyit/crouton-feedback — in-page feedback toolkit for any Nuxt UI app.
 *
 * Wired so far: the glasses launcher + tool registry + Console (eruda) tool
 * (epic #960, WS2 / #962). Still to come — the Annotate tool + the pluggable
 * feedback-sink dispatcher (#963/#964) and the sink-selection config surface
 * (the `feedback` options below, #965).
 *
 * The module deliberately depends only on Nuxt + Nuxt UI 4 — NOT on
 * @fyit/crouton-core — so any Nuxt UI app can install it.
 */
export interface FeedbackModuleOptions {
  /**
   * Where a sent annotation lands. Fleshed out in #965; declared here so the
   * `configKey` shape is stable from the first release.
   */
  feedback?: {
    /** Built-in destination. Defaults to `'webhook'` once #964/#965 land. */
    sink?: 'webhook' | 'slack' | 'discord' | 'github'
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
  setup(_options, nuxt) {
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
  }
})
