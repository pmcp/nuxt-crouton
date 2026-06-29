/**
 * Nuxt type augmentation for @fyit/crouton-analytics.
 *
 * Types `useRuntimeConfig().public.croutonAnalytics`. It's a top-level key (not nested under
 * `crouton.*`) because crouton-auth declares `crouton` as a closed `{ auth }` object literal with
 * no shared extension point — a second nested augmentation would conflict on interface merge.
 * A future cross-package refactor could introduce a shared `CroutonPublicRuntimeConfig` so all
 * package config lives under `crouton.*`; until then this stays a clean sibling key.
 */
import type { AnalyticsConfig } from '../app/utils/analytics-core'

declare module 'nuxt/schema' {
  interface PublicRuntimeConfig {
    croutonAnalytics?: AnalyticsConfig
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    croutonAnalytics?: AnalyticsConfig
  }
}

export {}
