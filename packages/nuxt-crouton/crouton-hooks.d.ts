/**
 * Type declarations for Nuxt Crouton runtime hooks
 *
 * This module augments Nuxt's RuntimeNuxtHooks to add the crouton:mutation hook
 * used for tracking CRUD operations (audit logs, analytics, etc.)
 */

export interface CroutonMutationEvent {
  operation: 'create' | 'update' | 'delete' | 'move' | 'reorder'
  collection: string
  itemId?: string
  itemIds?: string[]
  data?: Record<string, unknown>
  updates?: Record<string, unknown>
  result?: unknown
  /** The item data before the mutation (for update operations, enables change tracking) */
  beforeData?: Record<string, unknown>
  /** Correlation ID for linking related operations and events */
  correlationId?: string
  /** Timestamp when the mutation was initiated */
  timestamp?: number
}

declare module '#app' {
  interface RuntimeNuxtHooks {
    'crouton:mutation': (payload: CroutonMutationEvent) => void | Promise<void>
  }
}

export {}
