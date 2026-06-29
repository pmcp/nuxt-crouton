import { defineNuxtModule, createResolver } from '@nuxt/kit'

/**
 * @fyit/crouton-feedback — in-page feedback toolkit for any Nuxt UI app.
 *
 * Scaffold (epic #960, WS1 / #961): this is the empty shell. No runtime code is
 * wired yet — the launcher + Console (eruda) tool arrive in #962, the Annotate
 * tool + the pluggable feedback-sink dispatcher in #963/#964, and the
 * sink-selection config surface (the `feedback` options below) in #965.
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
  setup(_options, _nuxt) {
    // Reserved for the resolver the runtime workstreams will use to register
    // plugins, components, and the server handler.
    createResolver(import.meta.url)
    // No-op until #962 moves the launcher + Console tool in.
  }
})
