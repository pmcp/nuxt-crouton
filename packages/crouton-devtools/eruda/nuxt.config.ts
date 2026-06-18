import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const currentDir = fileURLToPath(new URL('.', import.meta.url))

// Opt-in mobile devtools layer: an app/poc adds
//   extends: ['@fyit/crouton-devtools/eruda']
// to get eruda (console / elements / network on mobile) — but ONLY in local dev
// or when NUXT_PUBLIC_CROUTON_ERUDA=true at build time. Production builds leave
// the flag false, so the eruda chunk is never fetched. Set the flag in an app's
// `cf:staging` script (never in `cf:deploy`). See crouton-devtools/CLAUDE.md.
export default defineNuxtConfig({
  $meta: {
    name: 'crouton-devtools/eruda',
    description: 'Opt-in eruda mobile devtools — local dev + staging only, never production'
  },

  runtimeConfig: {
    public: {
      // Overridable per build via NUXT_PUBLIC_CROUTON_ERUDA. Default off so prod
      // is safe unless a staging build explicitly turns it on.
      croutonEruda: false
    }
  },

  plugins: [join(currentDir, 'plugins/eruda.client')]
})
