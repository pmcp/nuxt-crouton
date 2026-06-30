import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import FeedbackLauncher from '../components/FeedbackLauncher.vue'
import { mountOverlayInBody } from '../overlay/mount'

/**
 * Mounts the unified feedback-tools launcher.
 *
 * The module only adds this plugin when feedback tools are enabled for the build
 * (local dev, or `NUXT_PUBLIC_CROUTON_FEEDBACK=true`); we double-check at runtime
 * so production ships nothing.
 *
 * The launcher is appended to `<body>` after mount and rendered with the host
 * app's context, so the global Nuxt UI components inside the SFC resolve —
 * without the host app having to place anything in its layout.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return

  const enabled = import.meta.dev || useRuntimeConfig().public.croutonFeedback
  if (!enabled) return

  nuxtApp.hook('app:mounted', () => {
    mountOverlayInBody(FeedbackLauncher, nuxtApp.vueApp._context, '__feedback_launcher_root')
  })
})
