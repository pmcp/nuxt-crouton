/**
 * User information for collaboration
 */
export interface CollabUser {
  id: string
  name: string
  color: string
}

/**
 * Awareness state for presence - what each user is doing
 * Extensible via index signature for custom properties
 */
export interface CollabAwarenessState {
  user: CollabUser
  cursor: { x: number; y: number } | null
  selection?: { anchor: number; head: number } | null
  selectedNodeId?: string | null
  ghostNode?: { id: string; position: { x: number; y: number } } | null
  [key: string]: unknown
}

/**
 * Connection state for a collaboration room
 */
export interface CollabConnectionState {
  connected: boolean
  synced: boolean
  error: Error | null
}

/**
 * Supported Yjs data structure types
 * - map: Y.Map for key-value data (flows, node graphs)
 * - array: Y.Array for ordered lists
 * - xmlFragment: Y.XmlFragment for rich text (TipTap)
 * - text: Y.Text for plain text
 */
export type CollabStructure = 'map' | 'array' | 'xmlFragment' | 'text'

/**
 * Options for useCollabSync composable (Phase 2)
 */
export interface UseCollabSyncOptions {
  /** Unique room identifier */
  roomId: string
  /** Room type (e.g., 'page', 'flow', 'document') */
  roomType: string
  /** Yjs data structure to use */
  structure: CollabStructure
  /** Name for the structure in Y.Doc (default: roomType) */
  structureName?: string
}

/**
 * Options for useCollabPresence composable (Phase 2)
 */
export interface UseCollabPresenceOptions {
  /** Current users in the room */
  users: CollabAwarenessState[]
  /** Current user's ID to filter self from others */
  currentUserId: string
}

/**
 * Options for useCollabEditor composable (Phase 2)
 * For TipTap/rich text collaboration
 */
export interface UseCollabEditorOptions {
  /** Unique room identifier */
  roomId: string
  /** Room type (default: 'page') */
  roomType?: string
  /** Field name for the editor content */
  field?: string
  /** User info for presence */
  user?: { name: string; color: string }
}

/**
 * JSON messages sent over the WebSocket
 */
export interface CollabRoomMessage {
  type: 'awareness' | 'ping' | 'pong'
  userId?: string
  state?: CollabAwarenessState
  users?: CollabAwarenessState[]
}

/**
 * Full sync state including users
 */
export interface CollabSyncState extends CollabConnectionState {
  users: CollabAwarenessState[]
}

/**
 * Options for the CollabRoom Durable Object
 * Passed via query params when connecting
 */
export interface CollabRoomOptions {
  /** Room type (e.g., 'page', 'flow', 'document') */
  type: string
  /** Room ID from URL path */
  roomId: string
  /** Optional collection name for future use */
  collection?: string
}
