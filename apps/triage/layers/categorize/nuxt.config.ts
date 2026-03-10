export default defineNuxtConfig({
  components: {
    dirs: [
      {
        path: './app/components',
        prefix: 'categorize',
        global: true,
      },
    ],
  },
})
