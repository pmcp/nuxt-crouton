export default defineNuxtConfig({
  extends: [
    './collections/pages'
  ],
  i18n: {
    locales: [
      { code: 'en', file: 'en.json' }
    ],
    langDir: './locales'
  }
})
