/**
 * Node data stored in Yjs Y.Map
 */
export interface YjsFlowNode {
  id: string
  title: string
  position: { x: number; y: number }
  parentId: string | null
  data: Record<string, unknown> // Additional collection fields
  createdAt: number
  updatedAt: number
}

/**
 * Ghost node state for drag preview
 */
export interface YjsGhostNode {
  id: string
  title: string
  collection: string
  position: { x: number; y: number }
}

/**
 * Awareness state for presence
 */
export interface YjsAwarenessState {
  user: {
    id: string
    name: string
    color: string
  }
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
  ghostNode?: YjsGhostNode | null
}

/**
 * Flow sync connection state
 */
export interface FlowSyncState {
  connected: boolean
  synced: boolean
  error: Error | null
  users: YjsAwarenessState[]
}
