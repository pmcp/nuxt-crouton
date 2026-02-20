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
