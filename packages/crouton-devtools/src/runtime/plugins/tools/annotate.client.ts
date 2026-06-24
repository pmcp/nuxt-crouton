import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useCroutonDevTools } from '../../composables/useCroutonDevTools'
import { createAnnotateTool } from '../../tools/annotate'
import { mountOverlayInBody } from '../../overlay/mount'
import CroutonAnnotate from '../../components/CroutonAnnotate.vue'

/**
 * Registers the Annotate tool (#810) and mounts its overlay (highlight +
 * comment panel) into the host app's context so Nuxt UI resolves.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonDevtools)) return

  useCroutonDevTools().registerTool(createAnnotateTool())

  nuxtApp.hook('app:mounted', () => {
    mountOverlayInBody(CroutonAnnotate, nuxtApp.vueApp._context, '__crouton_annotate_root')
  })
})
