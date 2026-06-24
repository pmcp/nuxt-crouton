import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useCroutonDevTools } from '../../composables/useCroutonDevTools'
import { createConsoleTool } from '../../tools/console'

/** Registers the Console (eruda) tool in the dev-tools menu (#810). */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonDevtools)) return

  useCroutonDevTools().registerTool(createConsoleTool())
})
