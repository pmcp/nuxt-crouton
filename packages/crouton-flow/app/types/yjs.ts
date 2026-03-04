// Re-export collab types from the canonical source
export type { CollabUser, CollabAwarenessState, CollabConnectionState } from '@fyit/crouton-collab/types'

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

