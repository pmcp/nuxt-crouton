// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt()
  .append({
    rules: {
      // Relax for documentation examples
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  })