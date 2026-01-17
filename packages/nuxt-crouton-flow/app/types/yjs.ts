/**
 * User information for collaboration
 * Compatible with crouton-collab's CollabUser
 */
export interface CollabUser {
  id: string
  name: string
  color: string
}

/**
 * Awareness state for presence - what each user is doing
 * Compatible with crouton-collab's CollabAwarenessState
 */
export interface CollabAwarenessState {
  user: CollabUser
  cursor: { x: number; y: number } | null
  selection?: { anchor: number; head: number } | null
  selectedNodeId?: string | null
  ghostNode?: { id: string; position: { x: number; y: number } } | null
  [key: string]: unknown // Extensible for flow-specific properties
}

/**
 * Connection state for a collaboration room
 * Compatible with crouton-collab's CollabConnectionState
 */
export interface CollabConnectionState {
  connected: boolean
  synced: boolean
  error: Error | null
}

/**
 * Node data stored in Yjs Y.Map
 */
export interface YjsFlowNode {
  id: string
  title: string
  position: { x: number, y: number }
  parentId: string | null
  data: Record<string, unknown> // Additional collection fields
  createdAt: number
  updatedAt: number
}

/**
 * Ghost node state for drag preview
 * Extended from collab's base ghost node with flow-specific fields
 */
export interface YjsGhostNode {
  id: string
  title: string
  collection: string
  position: { x: number, y: number }
}

/**
 * @deprecated Use CollabAwarenessState instead
 * Kept for backward compatibility
 */
export type YjsAwarenessState = CollabAwarenessState

/**
 * @deprecated Use CollabConnectionState with users array instead
 * Kept for backward compatibility
 */
export interface FlowSyncState extends CollabConnectionState {
  users: CollabAwarenessState[]
}
