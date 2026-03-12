import type { Component } from 'vue'

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
  /** Edge type: 'default' (bezier), 'smoothstep' (right angles), 'straight', 'step' */
  edgeType?: 'default' | 'smoothstep' | 'straight' | 'step'
  /** Node width for layout calculation (default: 172) */
  nodeWidth?: number
  /** Node height for layout calculation (default: 36) */
  nodeHeight?: number
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
 * Data mode for CroutonFlow — determines mutation behavior
 * - 'collection': Standard mode, mutations go through collection API
 * - 'ephemeral': Skip collection mutation, nodes are external (e.g. Notion pages)
 */
export type FlowDataMode = 'collection' | 'ephemeral'

/**
 * Registration for a custom node type component
 */
export interface NodeTypeRegistration {
  /** Vue component to render for this node type */
  component: Component
  /** Whether this node type acts as a spatial container (group) */
  isContainer?: boolean
}

/**
 * Container detection options for CroutonFlow
 */
export interface FlowContainerOptions {
  /** Enable container detection on drag stop */
  enabled: boolean
}

/**
 * Options for useFlowEphemeralData composable
 */
export interface UseFlowEphemeralDataOptions {
  /** Map an external item to a node type string */
  resolveNodeType?: (item: Record<string, unknown>) => string
  /** Map an external item to a container ID */
  resolveContainerId?: (item: Record<string, unknown>) => string | null
  /** Map an external item to node dimensions */
  resolveDimensions?: (item: Record<string, unknown>) => { width: number, height: number } | undefined
  /** Map an external item to a label string */
  resolveLabel?: (item: Record<string, unknown>) => string
  /** Map an external item to a position */
  resolvePosition?: (item: Record<string, unknown>) => { x: number, y: number } | undefined
}

/**
 * Options for useFlowContainerDetection composable
 */
export interface UseFlowContainerDetectionOptions {
  /** Node type registrations to determine which types are containers */
  nodeTypeComponents: Record<string, NodeTypeRegistration>
}

/**
 * Options for useFlowGroupManager composable
 */
export interface UseFlowGroupManagerOptions {
  /** Property name to group by (e.g. 'status', 'category') */
  groupByProperty?: string
  /** Default dimensions for new group nodes */
  defaultGroupDimensions?: { width: number, height: number }
}
