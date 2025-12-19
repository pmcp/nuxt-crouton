// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

/**
 * Root ESLint config for the nuxt-crouton monorepo.
 *
 * - Apps (apps/*) have their own eslint.config.mjs using @nuxt/eslint module
 * - Packages (packages/*) are linted by this root config
 * - Uses ESLint Stylistic for formatting (no Prettier needed)
 *
 * @see https://eslint.nuxt.com/packages/config
 */
export default createConfigForNuxt({
  features: {
    // Enable tooling rules for library/module development
    tooling: true,
    // Enable stylistic formatting rules (replaces Prettier)
    // Matches app configs in apps/*/nuxt.config.ts
    stylistic: {
      semi: false,
      quotes: 'single',
      indent: 2,
      commaDangle: 'never',
      braceStyle: '1tbs',
    },
  },
  dirs: {
    // Only lint packages from root (apps have their own configs)
    src: ['packages'],
  },
})
  .append({
    // Global ignores
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/coverage/**',
      // Apps are linted by their own configs
      'apps/**',
    ],
  })
  .append({
    // Rules for all files
    rules: {
      // Allow console in CLI tools
      'no-console': 'off',
      // Relax some rules for generated code patterns
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  })
