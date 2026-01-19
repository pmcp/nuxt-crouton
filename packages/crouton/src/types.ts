export interface CroutonOptions {
  /**
   * API prefix for all collection endpoints
   * @default '/api'
   */
  apiPrefix?: string

  /**
   * Default page size for collection queries
   * @default 20
   */
  defaultPageSize?: number

  // ═══════════════════════════════════════════════════════════════════════════
  // Core Add-ons (bundled, enabled by default)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Authentication with Better Auth, teams, passkeys, 2FA
   * @default true
   */
  auth?: boolean

  /**
   * Admin dashboard for team/user management
   * @default true
   */
  admin?: boolean

  /**
   * Multi-language support with DB-backed translations
   * @default true
   */
  i18n?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Optional Add-ons (disabled by default)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * TipTap rich text editor
   * @default false
   */
  editor?: boolean

  /**
   * Vue Flow graph visualization
   * @default false
   */
  flow?: boolean

  /**
   * Media library and asset management
   * @default false
   */
  assets?: boolean

  /**
   * Mapbox integration
   * @default false
   */
  maps?: boolean

  /**
   * AI/LLM integration with Vercel AI SDK
   * @default false
   */
  ai?: boolean

  /**
   * Email with Vue Email and Resend
   * @default false
   */
  email?: boolean

  /**
   * Audit trail and event tracking
   * @default false
   */
  events?: boolean

  /**
   * Real-time collaboration with Yjs
   * @default false
   */
  collab?: boolean

  /**
   * CMS pages system
   * @default false
   */
  pages?: boolean

  /**
   * Nuxt DevTools integration
   * @default true in development, false in production
   */
  devtools?: boolean

  // ═══════════════════════════════════════════════════════════════════════════
  // Mini-Apps (disabled by default)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Booking system for appointments and reservations
   * @default false
   */
  bookings?: boolean

  /**
   * Point of Sale system
   * @default false
   */
  sales?: boolean
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    crouton?: CroutonOptions
  }
  interface NuxtOptions {
    crouton?: CroutonOptions
  }
  interface PublicRuntimeConfig {
    crouton?: {
      apiPrefix: string
      defaultPageSize: number
    }
  }
}
