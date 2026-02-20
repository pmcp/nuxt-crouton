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

/**
 * Payload for the crouton:operation Nitro hook.
 *
 * Used for non-CRUD system events: auth lifecycle, email sends, AI calls,
 * webhook ingestion, etc. Call via useNitroApp().hooks.callHook('crouton:operation', payload)
 * from any server handler or Nitro plugin.
 *
 * Examples of type values:
 *   auth:login, auth:logout, auth:register
 *   auth:team:created, auth:team:member-added
 *   admin:user:banned, admin:impersonate:start
 *   email:sent, email:failed
 *   ai:translate, ai:chat
 *   asset:uploaded, asset:deleted
 *   booking:batch-created, webhook:received
 */
export interface CroutonOperationEvent {
  /** Dot-namespaced operation type, e.g. 'auth:login', 'email:sent' */
  type: string
  /** Package that emitted the event, e.g. 'crouton-auth', 'crouton-ai' */
  source: string
  teamId?: string
  userId?: string
  correlationId?: string
  /** Free-form metadata specific to the operation type */
  metadata?: Record<string, any>
  /** Milliseconds since epoch — defaults to Date.now() if omitted */
  timestamp?: number
}

declare module 'nitropack' {
  interface NitroRuntimeHooks {
    'crouton:operation': (payload: CroutonOperationEvent) => void | Promise<void>
  }
}

declare module 'h3' {
  interface H3EventContext {
    correlationId?: string
  }
}

export {}
