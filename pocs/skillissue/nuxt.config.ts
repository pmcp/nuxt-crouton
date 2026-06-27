// skill/issue — marketing site (pocs/skillissue, epic #917).
//
// Deliberately BESPOKE: we extend NO crouton theme layer. The site's look is a
// custom, experimental design (sub-issue #920) — the minimal/ko themes impose
// global Nuxt-UI slot replacers that would fight it. We keep @nuxt/ui purely for
// the Tailwind v4 + UApp plumbing; the visual language lives in app/assets/css.
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3040 },

  // Marketing site: no DB, no auth, no server routes. Prerendered to static
  // HTML — "just HTML" — so it deploys to Workers static assets with zero backend.
  ssr: true,
  nitro: {
    prerender: { crawlLinks: true, routes: ['/'] }
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en', class: 'si' },
      title: 'skill/issue — turn AI coding into a repeatable system',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content:
            'skill/issue turns AI coding into a repeatable system: a ticket says what to build, a reusable skill knows how, and out comes a reviewed PR — every time, traceably.'
        }
      ]
    }
  }
})
