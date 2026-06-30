// Standalone demo: a plain Nuxt + Nuxt UI app with ONLY @fyit/crouton-feedback
// installed (no crouton-core) — proves the module drops into any Nuxt UI app.
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@fyit/crouton-feedback'
  ],

  css: ['~/assets/css/main.css'],

  devtools: {
    enabled: true
  },

  compatibilityDate: '2025-01-01'
})
