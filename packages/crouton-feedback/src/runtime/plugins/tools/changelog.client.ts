import { watch } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { useFeedbackTools } from '../../composables/useFeedbackTools'
import { useChangelog } from '../../composables/useChangelog'
import { createChangelogTool } from '../../tools/changelog'
import { mountOverlayInBody } from '../../overlay/mount'
import ChangelogOverlay from '../../components/ChangelogOverlay.vue'

/**
 * Registers the Changelog tool and mounts its timeline overlay into the host
 * app's context (so Nuxt UI resolves). The tool hides itself when the app ships
 * no changelog entries, so installing the toolkit costs nothing until an app
 * provides a `changelog.json`.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) return
  if (!(import.meta.dev || useRuntimeConfig().public.croutonFeedback)) return

  const { entries, latest, open } = useChangelog()
  const registry = useFeedbackTools()

  const tool = createChangelogTool({
    getLatest: () => latest.value,
    hasEntries: () => entries.value.length > 0,
    setOpen: (v) => { open.value = v }
  })
  registry.registerTool(tool)

  // Keep the launcher's toggle in sync when the modal is dismissed from its own
  // close button (open → false) rather than via the switch.
  watch(open, (v) => { if (!v) registry.deactivate(tool) })

  nuxtApp.hook('app:mounted', () => {
    mountOverlayInBody(ChangelogOverlay, nuxtApp.vueApp._context, '__feedback_changelog_root')
  })
})
