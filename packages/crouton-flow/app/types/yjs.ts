// Re-export collab types from the canonical source
export type { CollabUser, CollabAwarenessState, CollabConnectionState } from '@fyit/crouton-collab/types'

/**
 * Node dimensions for resizable nodes
 */
export interface NodeDimensions {
  width: number
  height: number
}

/**
 * Node data stored in Yjs Y.Map
 */
export interface YjsFlowNode {
  id: string
  title: string
  position: { x: number, y: number }
  parentId: string | null
  /**
   * Row mirror — fields the bridge keeps in sync with the DB row.
   * Whatever the consuming app's collection schema defines lives here.
   * `useFlowSyncBridge` overwrites this on every row refetch, so do NOT
   * write Yjs-only state into this bag — use `ephemeral` instead.
   */
  data: Record<string, unknown>
  /**
   * Yjs-only ephemeral state — fields owned by collaborators in the room
   * that have no DB column to mirror against (e.g., live agent activity
   * from a worker, transient control signals from the browser).
   *
   * The row-sync watcher in `useFlowSyncBridge` never reads or writes this
   * field, so updates here survive row refetches. This is the namespace
   * for things like:
   *   - `agentLog`, `agentStatus` (worker → browser)
   *   - `userPrompt`, `userAbort`, `userSteer` (browser → worker)
   *
   * Use `useFlowSync().updateEphemeral(nodeId, patch)` to write here.
   */
  ephemeral?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  /** Visual node type — 'group', 'card', 'default', etc. */
  nodeType?: string
  /** Spatial parent (Vue Flow parentNode), separate from parentId (edge parent) */
  containerId?: string | null
  /** Dimensions for resizable nodes */
  dimensions?: NodeDimensions
  /** Inline styles (background color, border, etc.) */
  style?: Record<string, string>
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

