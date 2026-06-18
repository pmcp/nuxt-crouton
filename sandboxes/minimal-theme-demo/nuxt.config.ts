// Sandbox: visual check for the minimal theme's subtractive button styling
// (Nuxt UI 4.9 slot-class replacer, spike #364). Throwaway, human-eyeball,
// delete-after — see sandboxes/CLAUDE.md. Extends ONLY the `minimal` theme
// layer: a single-theme app, the clean case for the GLOBAL base-slot replacer
// (no ko/kr11 app.config in the mix).
export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3030 },

  extends: ['@fyit/crouton-themes/minimal']
})
