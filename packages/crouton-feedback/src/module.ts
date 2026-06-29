import { defineNuxtModule, createResolver, addImports, addPlugin, addServerHandler } from '@nuxt/kit'
import { createSourceStampTransform } from './runtime/transform/sourceStamp'

/**
 * @fyit/crouton-feedback — in-page feedback toolkit for any Nuxt UI app.
 *
 * Wired so far: the glasses launcher + tool registry + Console (eruda) tool
 * (#962), and the Annotate tool + source-stamp transform + the `/api/_feedback`
 * sink dispatcher (#963, webhook sink only). Still to come — the slack/discord/
 * github sinks (#964) and the full sink-selection config surface (#965).
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

    // Server dispatcher config. Empty-string defaults so the NUXT_CROUTON_FEEDBACK_*
    // env vars override at runtime (Nuxt only maps env onto keys already present).
    // The full typed options surface (slack/discord/github routing) lands in #965.
    ;(nuxt.options.runtimeConfig as Record<string, any>).croutonFeedback = {
      sink: process.env.NUXT_CROUTON_FEEDBACK_SINK || 'webhook',
      webhookUrl: process.env.NUXT_CROUTON_FEEDBACK_WEBHOOK_URL || ''
    }
    addServerHandler({
      route: '/api/_feedback',
      handler: resolver.resolve('./runtime/server/api/feedback.post'),
      method: 'post'
    })
  }
})
