import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: '.nuxt/hub/db/schema.mjs',
  out: 'server/db/migrations/sqlite'
})
