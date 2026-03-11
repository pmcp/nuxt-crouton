export default defineNuxtConfig({
  // Components from this layer auto-import with no prefix
  // The public layout override replaces crouton-pages' floating pill nav
  components: [
    { path: './app/components', pathPrefix: false }
  ]
})
