import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useFeedbackTools } from '../../composables/useFeedbackTools'
import { createAnnotateTool } from '../../tools/annotate'
import { mountOverlayInBody } from '../../overlay/mount'
import AnnotateOverlay from '../../components/AnnotateOverlay.vue'

/**
 * Registers the Annotate tool and mounts its overlay (highlight + comment panel)
 * into the host app's context so Nuxt UI resolves.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonFeedback)) return

  useFeedbackTools().registerTool(createAnnotateTool())

  nuxtApp.hook('app:mounted', () => {
    mountOverlayInBody(AnnotateOverlay, nuxtApp.vueApp._context, '__feedback_annotate_root')
  })
})
