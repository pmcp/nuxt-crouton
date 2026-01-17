/**
 * @friendlyinternet/nuxt-crouton-collab - Core Composables
 *
 * Real-time collaboration infrastructure using Yjs CRDTs.
 *
 * @example
 * ```ts
 * // Low-level WebSocket connection
 * import { useCollabConnection } from '@friendlyinternet/nuxt-crouton-collab'
 *
 * // High-level data structure sync
 * import { useCollabSync } from '@friendlyinternet/nuxt-crouton-collab'
 *
 * // Presence/awareness tracking
 * import { useCollabPresence } from '@friendlyinternet/nuxt-crouton-collab'
 *
 * // TipTap editor integration
 * import { useCollabEditor } from '@friendlyinternet/nuxt-crouton-collab'
 * ```
 */

// Low-level WebSocket connection manager
export {
  useCollabConnection,
  generateUserColor,
  type UseCollabConnectionOptions,
  type UseCollabConnectionReturn
} from './useCollabConnection'

// High-level data structure sync
export {
  useCollabSync,
  type UseCollabSyncOptions,
  type UseCollabSyncReturn
} from './useCollabSync'

// Presence/awareness tracking
export {
  useCollabPresence,
  type UseCollabPresenceOptions,
  type UseCollabPresenceReturn
} from './useCollabPresence'

// TipTap editor integration
export {
  useCollabEditor,
  type UseCollabEditorOptions,
  type UseCollabEditorReturn,
  type CollabAwareness,
  type CollabProvider
} from './useCollabEditor'
