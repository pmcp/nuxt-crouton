import { defineNuxtModule } from '@nuxt/kit'

/**
 * Ensures `hub.blob = true` before @nuxthub/core processes its config.
 *
 * Nuxt's layer config merging does not reliably deep-merge the `hub` object.
 * When an app declares any `hub: {}` key, NuxtHub receives blob: false (its
 * built-in default) and never registers the `hubBlob` auto-import.
 *
 * Also ensures the R2 wrangler binding is registered for dev mode.
 * NuxtHub 0.10+ only adds the R2 binding when `bucketName` is explicitly set,
 * but in dev the cloudflare-dev emulation needs it in the wrangler config
 * to create the local R2 emulation via miniflare.
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

    // Ensure the R2 wrangler binding exists for cloudflare-dev emulation.
    // NuxtHub 0.10+ only registers this when bucketName is set, but miniflare
    // needs it to create the local R2 binding in dev mode.
    if (hub.blob !== false) {
      const cf = nuxt.options.nitro.cloudflare ||= {} as any
      cf.wrangler ||= {}
      cf.wrangler.r2_buckets ||= []
      if (!cf.wrangler.r2_buckets.some((b: any) => b.binding === 'BLOB')) {
        cf.wrangler.r2_buckets.push({ binding: 'BLOB', bucket_name: 'crouton-blob' })
      }
    }
  }
})
