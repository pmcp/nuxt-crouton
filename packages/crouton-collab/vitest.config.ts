import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**'
    ],
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'app/composables/**/*.ts',
        'app/components/**/*.vue',
        'server/utils/**/*.ts'
      ],
      exclude: ['tests/**', 'node_modules/**']
    }
  },
  resolve: {
    alias: {
      '#imports': resolve(__dirname, './tests/mocks/nuxt-imports.ts'),
      'vue': 'vue'
    }
  }
})
