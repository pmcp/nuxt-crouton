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
