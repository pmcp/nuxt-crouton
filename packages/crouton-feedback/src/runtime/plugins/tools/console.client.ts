import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useFeedbackTools } from '../../composables/useFeedbackTools'
import { createConsoleTool } from '../../tools/console'

/** Registers the Console (eruda) tool in the feedback-tools menu. */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonFeedback)) return

  useFeedbackTools().registerTool(createConsoleTool())
})
