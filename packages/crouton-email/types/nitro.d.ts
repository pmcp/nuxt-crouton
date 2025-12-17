/**
 * Type declarations for Nitro auto-imports.
 * These are automatically available at runtime but need explicit declarations
 * for standalone typecheck in layer packages.
 */

import type { RuntimeConfig } from 'nuxt/schema'

declare global {
  /**
   * Get the runtime configuration.
   * @see https://nuxt.com/docs/api/composables/use-runtime-config
   */
  function useRuntimeConfig(event?: any): RuntimeConfig

  /**
   * Define Nuxt configuration.
   * @see https://nuxt.com/docs/api/nuxt-config
   */
  function defineNuxtConfig(config: any): any
}

export {}
