// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt()
  .append({
    rules: {
      // Relax for playground experimentation
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  })