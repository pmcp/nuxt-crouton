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

/**
 * Augment NitroRuntimeHooks with crouton:operation for standalone typecheck.
 * The full CroutonOperationEvent type is declared in crouton-core/crouton-hooks.d.ts.
 * This minimal augmentation allows server/utils/email.ts to call the hook
 * without requiring crouton-core to be present in this package's tsconfig includes.
 */
declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'crouton:operation': (payload: {
      type: string
      source: string
      teamId?: string
      userId?: string
      correlationId?: string
      metadata?: Record<string, any>
      timestamp?: number
    }) => void | Promise<void>
  }
}

export {}
