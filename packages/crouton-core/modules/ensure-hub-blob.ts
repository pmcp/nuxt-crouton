import { defineNuxtModule } from '@nuxt/kit'

/**
 * Ensures `hub.blob = true` before @nuxthub/core processes its config.
 *
 * Nuxt's layer config merging does not reliably deep-merge the `hub` object.
 * When an app declares any `hub: {}` key, NuxtHub receives blob: false (its
 * built-in default) and never registers the `hubBlob` auto-import.
 *
 * This module is listed BEFORE @nuxthub/core in crouton-core's modules array,
 * so it runs first and sets the default. Apps can still override with
 * `hub: { blob: false }` to opt out.
 */
export default defineNuxtModule({
  meta: {
    name: 'crouton-core:ensure-hub-blob',
  },
  setup (_options, nuxt) {
    const hub = (nuxt.options as any).hub ?? {}
    if (hub.blob === undefined || hub.blob === null) {
      hub.blob = true
      ;(nuxt.options as any).hub = hub
    }
  }
})
