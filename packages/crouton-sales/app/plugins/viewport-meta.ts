/**
 * Kassa viewport meta:
 *  - viewport-fit=cover exposes env(safe-area-inset-*) on iOS — the phone
 *    full-screen kassa pads with them (header under the status bar, cart bar
 *    above Safari's floating bottom bar).
 *  - maximum-scale=1 suppresses iOS Safari's auto-zoom when focusing inputs
 *    with <16px font (Nuxt UI inputs are 14px). Pinch-zoom keeps working —
 *    Safari ignores maximum-scale for user gestures since iOS 10.
 *
 * Done at runtime via useHead because a layer nuxt.config's app.head cannot
 * override Nuxt's app-level default viewport meta (the schema default wins
 * the config merge); unhead dedupes meta[name=viewport], so this replaces it.
 */
export default defineNuxtPlugin(() => {
  useHead({
    meta: [
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
      }
    ]
  })
})
