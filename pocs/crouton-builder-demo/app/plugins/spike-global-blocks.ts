import { defineNuxtPlugin } from 'nuxt/app'
import SpikeSpacer from '~/components/SpikeSpacer.vue'
import SpikeGhostPane from '~/components/SpikeGhostPane.vue'

/**
 * Register the POC layout-block components GLOBALLY (#952).
 *
 * `CroutonLayoutRenderer` (a package component) resolves a leaf's block to a component by NAME via
 * `<component :is="block.component">`. A runtime string `:is` only resolves GLOBALLY-registered
 * components — Nuxt's per-file auto-import (`<SpikeSpacer/>`) does NOT make a name resolvable that
 * way. Package block components (e.g. `CroutonLayoutSpikeStats`) are global, so they resolve; our POC
 * components weren't, so `:is="'SpikeSpacer'"` rendered a dead `<spikespacer>` element (and the ghost
 * pane silently rendered empty — it only "worked" because it still opened the slot). Registering them
 * here makes the registry's `component: 'SpikeSpacer'` / `'SpikeGhostPane'` resolve in the renderer.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.component('SpikeSpacer', SpikeSpacer)
  nuxtApp.vueApp.component('SpikeGhostPane', SpikeGhostPane)
})
