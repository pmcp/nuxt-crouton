import type { Node, Edge, XYPosition } from '@vue-flow/core'
import type { ComputedRef, Ref } from 'vue'

/**
 * Position stored in collection records
 */
export interface FlowPosition {
  x: number
  y: number
}

/**
 * Configuration for flow visualization of a collection
 */
export interface FlowConfig {
  /** Field name where position { x, y } is stored */
  positionField?: string
  /** Auto-layout algorithm to use when positions are missing */
  autoLayout?: 'dagre' | 'none'
  /** Direction for dagre layout */
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  /** Spacing between nodes */
  nodeSpacing?: number
  /** Spacing between ranks/levels */
  rankSpacing?: number
}

/**
 * Options for useFlowData composable
 */
export interface UseFlowDataOptions {
  /** Field name containing parent ID (for tree/DAG structure) */
  parentField?: string
  /** Field name containing position { x, y } */
  positionField?: string
  /** Field to use as node label if no custom node component */
  labelField?: string
}

/**
 * Options for useFlowLayout composable
 */
export interface UseFlowLayoutOptions {
  /** Layout direction */
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  /** Horizontal spacing between nodes */
  nodeSpacing?: number
  /** Vertical spacing between ranks */
  rankSpacing?: number
  /** Node width for layout calculation */
  nodeWidth?: number
  /** Node height for layout calculation */
  nodeHeight?: number
}

/**
 * Result from useFlowData composable
 */
export interface UseFlowDataResult<T = Record<string, unknown>> {
  /** Vue Flow nodes derived from rows */
  nodes: ComputedRef<Node<T>[]>
  /** Vue Flow edges derived from parent relationships */
  edges: ComputedRef<Edge[]>
  /** Get a node by its ID */
  getNode: (id: string) => Node<T> | undefined
  /** Get an item by its ID */
  getItem: (id: string) => T | undefined
}

/**
 * Result from useFlowLayout composable
 */
export interface UseFlowLayoutResult {
  /** Apply dagre layout to nodes */
  applyLayout: (nodes: Node[], edges: Edge[]) => Node[]
  /** Check if any nodes need layout (missing positions) */
  needsLayout: (nodes: Node[]) => boolean
}

/**
 * Result from useFlowMutation composable
 */
export interface UseFlowMutationResult {
  /** Update node position */
  updatePosition: (id: string, position: XYPosition) => Promise<void>
  /** Whether a mutation is in progress */
  pending: Ref<boolean>
  /** Any error from the last mutation */
  error: Ref<Error | null>
}

/**
 * Props for CroutonFlow component
 */
export interface CroutonFlowProps {
  /** Collection rows to display as nodes */
  rows: Record<string, unknown>[]
  /** Collection name for component resolution and mutations */
  collection: string
  /** Field containing parent ID */
  parentField?: string
  /** Field containing position { x, y } */
  positionField?: string
  /** Field to use as label */
  labelField?: string
  /** Flow configuration */
  flowConfig?: FlowConfig
  /** Whether to show controls */
  controls?: boolean
  /** Whether to show minimap */
  minimap?: boolean
  /** Whether to show background */
  background?: boolean
  /** Background pattern */
  backgroundPattern?: 'dots' | 'lines'
  /** Whether nodes are draggable */
  draggable?: boolean
  /** Whether to fit view on mount */
  fitViewOnMount?: boolean
}

/**
 * Props for CroutonFlowNode component (default node)
 */
export interface CroutonFlowNodeProps {
  /** The data item from the collection */
  data: Record<string, unknown>
  /** Whether this node is selected */
  selected?: boolean
  /** Whether this node is being dragged */
  dragging?: boolean
}

/**
 * Emits for CroutonFlow component
 */
export interface CroutonFlowEmits {
  /** Emitted when a node is clicked */
  (e: 'nodeClick', nodeId: string, data: Record<string, unknown>): void
  /** Emitted when a node is double-clicked */
  (e: 'nodeDblClick', nodeId: string, data: Record<string, unknown>): void
  /** Emitted when a node position changes (after drag) */
  (e: 'nodeMove', nodeId: string, position: FlowPosition): void
  /** Emitted when an edge is clicked */
  (e: 'edgeClick', edgeId: string): void
  /** Emitted when selection changes */
  (e: 'selectionChange', selectedNodeIds: string[]): void
  /** Emitted when an item is dropped onto the flow */
  (e: 'nodeDrop', item: Record<string, unknown>, position: FlowPosition, collection: string): void
}

/**
 * Data transferred during drag-and-drop from collection items
 */
export interface CroutonDragData {
  /** Discriminator for drag type */
  type: 'crouton-item'
  /** Source collection name */
  collection: string
  /** The item being dragged */
  item: Record<string, unknown>
}

/**
 * Options for drop zone validation
 */
export interface DropZoneOptions {
  /** Collections allowed to be dropped (empty = all allowed) */
  allowedCollections?: string[]
  /** Custom validation function */
  validate?: (item: Record<string, unknown>, collection: string) => boolean
}
