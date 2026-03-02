import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'

/**
 * Ensures `hub.blob` is configured before @nuxthub/core processes its config.
 *
 * Nuxt's layer config merging does not reliably deep-merge the `hub` object.
 * When an app declares any `hub: {}` key, NuxtHub receives blob: false (its
 * built-in default) and never registers the `hubBlob` auto-import.
 *
 * In dev mode with cloudflare presets, NuxtHub picks the cloudflare-r2 driver
 * which requires a working R2 binding from miniflare. This is fragile (needs
 * wrangler.toml R2 config, proper getPlatformProxy init, etc.). Instead, we
 * force the `fs` driver in dev mode — files go to `.data/blob/`, same API.
 *
 * This module is listed BEFORE @nuxthub/core in crouton-core's modules array,
 * so it runs first and sets the default. Apps can still override with
 * `hub: { blob: false }` to opt out, or provide an explicit driver config.
 */
export default defineNuxtModule({
  meta: {
    name: 'crouton-core:ensure-hub-blob',
  },
  setup (_options, nuxt) {
    const hub = (nuxt.options as any).hub ?? {}

    // If blob is already configured with an explicit driver, don't override
    if (typeof hub.blob === 'object' && 'driver' in hub.blob) {
      ;(nuxt.options as any).hub = hub
      return
    }

    if (hub.blob === undefined || hub.blob === null) {
      hub.blob = true
    }

    // In dev mode with cloudflare preset, use filesystem driver instead of R2.
    // NuxtHub 0.10+'s cloudflare-r2 driver needs a working miniflare R2 binding
    // which is unreliable in monorepo dev. The fs driver is simpler and works
    // identically (same blob.put/serve/delete API).
    const preset = process.env.NITRO_PRESET || nuxt.options.nitro?.preset || ''
    if (nuxt.options.dev && hub.blob !== false && String(preset).includes('cloudflare')) {
      const dataDir = hub.dir || '.data'
      hub.blob = {
        driver: 'fs',
        dir: join(nuxt.options.rootDir, dataDir, 'blob')
      }
    }

    ;(nuxt.options as any).hub = hub
  }
})
