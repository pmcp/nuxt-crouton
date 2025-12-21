<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, resolveComponent, watch, markRaw } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import type { _CroutonFlowProps, FlowConfig, FlowPosition, CroutonDragData } from '../types/flow'
import type { YjsFlowNode } from '../types/yjs'
import { useFlowData } from '../composables/useFlowData'
import { useFlowLayout } from '../composables/useFlowLayout'
import { useDebouncedPositionUpdate } from '../composables/useFlowMutation'
import { useFlowSync } from '../composables/useFlowSync'
import CroutonFlowNode from './Node.vue'
import CroutonFlowGhostNode from './GhostNode.vue'

// Import default styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

// Register custom node types for VueFlow
const nodeTypes = {
  ghost: markRaw(CroutonFlowGhostNode)
}

/**
 * CroutonFlow - Main Vue Flow wrapper component
 *
 * Renders collection data as an interactive node graph with:
 * - Automatic dagre layout for tree/DAG structures
 * - Drag-and-drop node positioning with persistence
 * - Custom node component resolution
 * - Parent-based edge generation
 * - Real-time multiplayer sync (when sync mode enabled)
 *
 * @example
 * ```vue
 * <!-- Without sync (existing behavior) -->
 * <CroutonFlow
 *   :rows="decisions"
 *   collection="decisions"
 *   parent-field="parentId"
 *   position-field="position"
 * />
 *
 * <!-- With sync (multiplayer mode) -->
 * <CroutonFlow
 *   collection="decisions"
 *   sync
 *   :flow-id="projectId"
 * />
 * ```
 */

interface Props {
  /** Collection rows to display as nodes (not needed when sync=true) */
  rows?: Record<string, unknown>[]
  /** Collection name for component resolution and mutations */
  collection: string
  /** Field containing parent ID (default: 'parentId') */
  parentField?: string
  /** Field containing position { x, y } (default: 'position') */
  positionField?: string
  /** Field to use as label (default: 'title') */
  labelField?: string
  /** Flow configuration */
  flowConfig?: FlowConfig
  /** Whether to show controls (default: true) */
  controls?: boolean
  /** Whether to show minimap (default: false) */
  minimap?: boolean
  /** Whether to show background (default: true) */
  background?: boolean
  /** Background pattern (default: 'dots') */
  backgroundPattern?: 'dots' | 'lines'
  /** Whether nodes are draggable (default: true) */
  draggable?: boolean
  /** Whether to fit view on mount (default: true) */
  fitViewOnMount?: boolean
  /** Enable real-time sync mode */
  sync?: boolean
  /** Flow ID for sync mode (required if sync=true) */
  flowId?: string
  /** Allow items to be dropped onto the flow (default: false) */
  allowDrop?: boolean
  /** Collections allowed to be dropped (empty = all allowed) */
  allowedCollections?: string[]
  /** Whether to auto-create nodes when items are dropped (default: true in sync mode) */
  autoCreateOnDrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  parentField: 'parentId',
  positionField: 'position',
  labelField: 'title',
  controls: true,
  minimap: false,
  background: true,
  backgroundPattern: 'dots',
  draggable: true,
  fitViewOnMount: true,
  sync: false,
  allowDrop: false,
  allowedCollections: () => [],
  autoCreateOnDrop: true
})

const emit = defineEmits<{
  /** Emitted when a node is clicked */
  nodeClick: [nodeId: string, data: Record<string, unknown>]
  /** Emitted when a node is double-clicked */
  nodeDblClick: [nodeId: string, data: Record<string, unknown>]
  /** Emitted when a node position changes (after drag) */
  nodeMove: [nodeId: string, position: FlowPosition]
  /** Emitted when an edge is clicked */
  edgeClick: [edgeId: string]
  /** Emitted when selection changes */
  selectionChange: [selectedNodeIds: string[]]
  /** Emitted when an item is dropped onto the flow */
  nodeDrop: [item: Record<string, unknown>, position: FlowPosition, collection: string]
}>()

// Validate props
if (props.sync && !props.flowId) {
  console.warn('[CroutonFlow] flowId is required when sync mode is enabled')
}

// Container ref for potential future use
const containerRef = ref<HTMLElement | null>(null)

// Dark mode detection - useColorMode is auto-imported by Nuxt
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// ============================================
// SYNC MODE: Use Yjs for real-time sync
// ============================================
const syncState = props.sync && props.flowId
  ? useFlowSync({
      flowId: props.flowId,
      collection: props.collection
    })
  : null

// Seed Yjs doc from rows if needed (when sync mode with rows but empty Yjs doc)
const seeded = ref(false)
watch(
  () => syncState?.synced.value,
  (synced) => {
    if (synced && syncState && !seeded.value) {
      // Check if Yjs already has nodes (from previous session)
      if (syncState.nodes.value.length > 0) {
        seeded.value = true
        return
      }

      // Yjs doc is empty but we have rows - seed it
      if (props.rows && props.rows.length > 0) {
        for (const row of props.rows) {
          const id = String(row.id || crypto.randomUUID())
          const title = String(row[props.labelField] || 'Untitled')
          const parentId = row[props.parentField] as string | null | undefined
          const rawPosition = row[props.positionField]

          // Handle position - could be string JSON, object, or undefined
          let position: FlowPosition | null = null
          if (rawPosition) {
            if (typeof rawPosition === 'string') {
              try {
                position = JSON.parse(rawPosition)
              } catch {
                console.warn('[CroutonFlow] Failed to parse position string:', rawPosition)
              }
            } else if (typeof rawPosition === 'object' && 'x' in rawPosition && 'y' in rawPosition) {
              position = rawPosition as FlowPosition
            }
          }

          const finalPosition = position || { x: 0, y: 0 }

          syncState.createNode({
            id,
            title,
            parentId: parentId || null,
            position: finalPosition,
            data: { ...row }
          })
        }
        seeded.value = true
      }
    }
  },
  { immediate: true }
)

// Watch for new/updated items in rows and sync them to Yjs
// Watch both seeded state AND rows to trigger when either changes
watch(
  () => ({
    rows: props.rows,
    length: props.rows?.length ?? 0,
    seeded: seeded.value
  }),
  ({ rows: newRows, seeded: isSeeded }) => {
    if (!syncState || !isSeeded || !newRows) {
      return
    }

    // Get existing nodes from Yjs as a map for quick lookup
    const existingNodes = new Map(syncState.nodes.value.map(n => [n.id, n]))

    // Sync rows to Yjs (add new, update existing)
    for (const row of newRows) {
      const id = String(row.id)
      const title = String(row[props.labelField] || 'Untitled')
      const parentId = row[props.parentField] as string | null | undefined
      const rawPosition = row[props.positionField]

      // Handle position
      let position: FlowPosition | null = null
      if (rawPosition) {
        if (typeof rawPosition === 'string') {
          try {
            position = JSON.parse(rawPosition)
          } catch { /* ignore */ }
        } else if (typeof rawPosition === 'object' && 'x' in rawPosition && 'y' in rawPosition) {
          position = rawPosition as FlowPosition
        }
      }

      const existingNode = existingNodes.get(id)
      if (!existingNode) {
        // New item - add to Yjs
        syncState.createNode({
          id,
          title,
          parentId: parentId || null,
          position: position || { x: 0, y: 0 },
          data: { ...row }
        })
      } else {
        // Existing item - check if data changed (compare title, parentId, and data)
        const titleChanged = existingNode.title !== title
        const parentChanged = existingNode.parentId !== (parentId || null)
        // Compare data by checking key fields (exclude position which is managed by Yjs)
        const dataChanged = JSON.stringify({ ...existingNode.data, [props.positionField]: undefined })
          !== JSON.stringify({ ...row, [props.positionField]: undefined })

        if (titleChanged || parentChanged || dataChanged) {
          syncState.updateNode(id, {
            title,
            parentId: parentId || null,
            data: { ...row }
          })
        }
      }
    }

    // Handle deletions - remove nodes from Yjs that are no longer in rows
    const rowIds = new Set(newRows.map(r => String(r.id)))
    for (const [nodeId] of existingNodes) {
      if (!rowIds.has(nodeId)) {
        syncState.deleteNode(nodeId)
      }
    }
  },
  { deep: true, immediate: true }
)

// Convert sync nodes to Vue Flow format
const syncNodes = computed<Node[]>(() => {
  if (!syncState) return []

  return syncState.nodes.value.map((node: YjsFlowNode) => ({
    id: node.id,
    type: 'default',
    position: node.position,
    data: {
      ...node.data,
      id: node.id,
      title: node.title,
      parentId: node.parentId
    },
    label: node.title
  }))
})

// Watch for new nodes and clear ghost if a real node appears near ghost position
// This provides smooth visual transition from ghost to real node
watch(
  () => syncNodes.value.length,
  (newLength, oldLength) => {
    // Only check if a node was added and we have a pending ghost
    if (newLength > oldLength && localGhostNode.value) {
      const ghostPos = localGhostNode.value.position
      // Check if any new node is near the ghost position (within 50px)
      const hasNodeNearGhost = syncNodes.value.some((node) => {
        const dx = Math.abs(node.position.x - ghostPos.x)
        const dy = Math.abs(node.position.y - ghostPos.y)
        return dx < 50 && dy < 50
      })

      if (hasNodeNearGhost) {
        // Real node appeared - clear ghost immediately
        localGhostNode.value = null
        if (props.sync && syncState) {
          syncState.clearGhostNode()
        }
        // Clear the timeout if it's still pending
        if (ghostCleanupTimeout) {
          clearTimeout(ghostCleanupTimeout)
          ghostCleanupTimeout = null
        }
      }
    }
  }
)

// Generate edges from sync nodes
const syncEdges = computed(() => {
  if (!syncState) return []

  const result: { id: string, source: string, target: string, type: string }[] = []
  const nodeIds = new Set(syncState.nodes.value.map((n: YjsFlowNode) => n.id))

  for (const node of syncState.nodes.value) {
    if (node.parentId && nodeIds.has(node.parentId)) {
      result.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'default'
      })
    }
  }

  return result
})

// Ghost nodes from other users' awareness (for multiplayer drag preview)
const remoteGhostNodes = computed<Node[]>(() => {
  if (!props.sync || !syncState) return []

  const currentUserId = syncState.user.value?.id
  return syncState.users.value
    .filter(u => u.user.id !== currentUserId && u.ghostNode)
    .map(u => ({
      id: `ghost-${u.user.id}`,
      type: 'default',
      position: u.ghostNode!.position,
      data: {
        isGhost: true,
        title: u.ghostNode!.title,
        userName: u.user.name,
        userColor: u.user.color
      },
      draggable: false,
      selectable: false
    }))
})

// ============================================
// STANDALONE MODE: Use props-based data
// ============================================

// Convert rows to reactive ref
const rowsRef = computed(() => props.rows || [])

// Convert rows to nodes and edges
const { nodes: dataNodes, edges: dataEdges, getItem } = useFlowData(
  rowsRef,
  {
    parentField: props.parentField,
    positionField: props.positionField,
    labelField: props.labelField
  }
)

// Layout utilities
const layoutOptions = computed(() => ({
  direction: props.flowConfig?.direction ?? 'TB',
  nodeSpacing: props.flowConfig?.nodeSpacing ?? 50,
  rankSpacing: props.flowConfig?.rankSpacing ?? 100
}))

const { applyLayout, applyLayoutToNew, needsLayout } = useFlowLayout(layoutOptions.value)

// Position mutation (debounced) - only for standalone mode
const { debouncedUpdate } = useDebouncedPositionUpdate(
  props.collection,
  props.positionField,
  500
)

// Track if initial layout has been applied (standalone mode)
const initialLayoutApplied = ref(false)

// Apply layout to nodes that need it (standalone mode only)
// Only applies layout ONCE on initial load, then preserves all positions
const layoutedNodes = computed(() => {
  const nodes = dataNodes.value
  const edges = dataEdges.value

  // Only apply layout on initial load (when all nodes are at 0,0)
  // After that, preserve all positions - no dagre at all
  if (!initialLayoutApplied.value && needsLayout(nodes)) {
    const result = applyLayout(nodes, edges)
    // Mark layout as applied (in nextTick to avoid mutation during render)
    nextTick(() => {
      initialLayoutApplied.value = true
    })
    return result
  }

  // After initial layout, just return nodes as-is
  // New nodes will appear at their drop position (or 0,0 if no position set)
  return nodes
})

// ============================================
// FINAL COMPUTED VALUES
// ============================================

// Track if we've applied initial layout to Yjs
const layoutAppliedToYjs = ref(false)

// Use sync nodes or legacy nodes based on mode
// In sync mode: Only apply layout ONCE on initial load (when all nodes are at 0,0)
// After that, positions are managed by Yjs and preserved across sessions
// New nodes dropped on canvas get their position from the drop handler
const finalNodes = computed(() => {
  let baseNodes: Node[]

  if (props.sync && syncState) {
    const nodes = syncNodes.value
    const edges = syncEdges.value

    // needsLayout only returns true when ALL nodes are at (0,0) - i.e., initial load
    // It does NOT return true just because a single new node was added
    const needsLayoutResult = needsLayout(nodes)

    // Only apply initial layout ONCE, then respect Yjs positions forever
    if (needsLayoutResult && !layoutAppliedToYjs.value) {
      const layoutedNodesResult = applyLayout(nodes, edges)

      // Write layout positions back to Yjs so they persist
      // Use nextTick to avoid updating during render
      nextTick(() => {
        for (const node of layoutedNodesResult) {
          if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
            syncState.updatePosition(node.id, node.position)
          }
        }
        layoutAppliedToYjs.value = true
      })

      baseNodes = layoutedNodesResult
    } else {
      // Use Yjs positions as-is - this preserves manually positioned nodes
      // and new nodes with drop positions
      baseNodes = nodes
    }
  } else {
    baseNodes = layoutedNodes.value
  }

  // Include ghost nodes (local + remote)
  const ghosts: Node[] = [
    ...(localGhostNode.value ? [localGhostNode.value] : []),
    ...remoteGhostNodes.value
  ]

  return [...baseNodes, ...ghosts]
})

const finalEdges = computed(() => {
  if (props.sync && syncState) {
    return syncEdges.value
  }
  return dataEdges.value
})

// ============================================
// EVENT HANDLERS
// ============================================

// Use VueFlow instance
const {
  onNodeDrag,
  onNodeDragStop,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  screenToFlowCoordinate
} = useVueFlow()

// Throttle for real-time drag sync (sync every 50ms during drag)
let lastDragSync = 0
const DRAG_SYNC_THROTTLE = 50

// Handle node drag - sync position in real-time
onNodeDrag((event: NodeDragEvent) => {
  if (!props.draggable || !props.sync || !syncState) return

  const now = Date.now()
  if (now - lastDragSync < DRAG_SYNC_THROTTLE) return
  lastDragSync = now

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }

  // Sync to Yjs in real-time
  syncState.updatePosition(node.id, position)
})

// Handle node drag end - final position sync
onNodeDragStop((event: NodeDragEvent) => {
  if (!props.draggable) return

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }

  if (props.sync && syncState) {
    // Final sync to Yjs
    syncState.updatePosition(node.id, position)
  } else {
    // Persist via debounced mutation (standalone mode)
    debouncedUpdate(node.id, position)
  }

  // Emit event
  emit('nodeMove', node.id, position)
})

// Handle node click
onNodeClick(({ node }) => {
  if (props.sync && syncState) {
    const syncNode = syncState.getNode(node.id)
    if (syncNode) {
      syncState.selectNode(node.id)
      emit('nodeClick', node.id, { ...syncNode.data, id: syncNode.id, title: syncNode.title })
    }
  } else {
    const item = getItem(node.id)
    if (item) {
      emit('nodeClick', node.id, item)
    }
  }
})

// Handle node double-click
onNodeDoubleClick(({ node }) => {
  if (props.sync && syncState) {
    const syncNode = syncState.getNode(node.id)
    if (syncNode) {
      emit('nodeDblClick', node.id, { ...syncNode.data, id: syncNode.id, title: syncNode.title })
    }
  } else {
    const item = getItem(node.id)
    if (item) {
      emit('nodeDblClick', node.id, item)
    }
  }
})

// Handle edge click
onEdgeClick(({ edge }) => {
  emit('edgeClick', edge.id)
})

// ============================================
// DRAG & DROP FROM EXTERNAL SOURCES
// ============================================

// Visual feedback for drag over (legacy - will be replaced by ghost nodes)
const isDragOver = ref(false)

// Local ghost node state (what this user is dragging)
const localGhostNode = ref<Node | null>(null)

// Timeout ID for delayed ghost cleanup (used when autoCreateOnDrop is false)
let ghostCleanupTimeout: ReturnType<typeof setTimeout> | null = null

// Throttle for ghost node awareness sync
let lastGhostSync = 0
const GHOST_SYNC_THROTTLE = 50

/**
 * Parse drag data from dataTransfer
 */
function parseDragData(event: DragEvent): CroutonDragData | null {
  try {
    const data = event.dataTransfer?.getData('application/json')
    if (!data) return null

    const parsed = JSON.parse(data)
    if (parsed.type !== 'crouton-item') return null

    return parsed as CroutonDragData
  } catch {
    return null
  }
}

/**
 * Check if a drag item is allowed to be dropped
 */
function isDropAllowed(dragData: CroutonDragData): boolean {
  if (!props.allowDrop) return false

  // Check allowed collections
  if (props.allowedCollections && props.allowedCollections.length > 0) {
    return props.allowedCollections.includes(dragData.collection)
  }

  return true
}

/**
 * Handle dragover - show ghost node at cursor position
 */
function handleDragOver(event: DragEvent) {
  if (!props.allowDrop) return

  // Check if this is a valid crouton drag (can only check types during dragover, not data)
  const types = event.dataTransfer?.types || []
  if (!types.includes('application/json')) return

  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  isDragOver.value = true

  // Convert screen coordinates to flow coordinates
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY
  })

  const userName = props.sync && syncState?.user.value?.name || 'You'
  const userColor = props.sync && syncState?.user.value?.color || '#3b82f6'

  // Update local ghost node with generic title (browser security blocks reading data during dragover)
  localGhostNode.value = {
    id: 'local-ghost',
    type: 'default',
    position: { x: position.x, y: position.y },
    data: {
      isGhost: true,
      title: 'New Node',
      userName,
      userColor
    },
    draggable: false,
    selectable: false
  }
  // Broadcast to other users (throttled) in sync mode
  const now = Date.now()
  if (props.sync && syncState && now - lastGhostSync >= GHOST_SYNC_THROTTLE) {
    lastGhostSync = now
    syncState.updateGhostNode({
      id: `ghost-${syncState.user.value?.id}`,
      title: 'New Node',
      collection: props.collection,
      position: { x: Math.round(position.x), y: Math.round(position.y) }
    })
  }
}

/**
 * Handle dragleave - clear ghost node
 */
function handleDragLeave(event: DragEvent) {
  // Only handle if leaving the container (not entering a child)
  const relatedTarget = event.relatedTarget as HTMLElement | null
  if (relatedTarget && containerRef.value?.contains(relatedTarget)) return

  isDragOver.value = false

  // Clear local ghost node
  localGhostNode.value = null

  // Clear broadcast in sync mode
  if (props.sync && syncState) {
    syncState.clearGhostNode()
  }
}

/**
 * Handle drop - create node from dropped item
 */
function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false

  // Clear any pending ghost cleanup
  if (ghostCleanupTimeout) {
    clearTimeout(ghostCleanupTimeout)
    ghostCleanupTimeout = null
  }

  if (!props.allowDrop) {
    // Not allowed - clear ghost immediately
    localGhostNode.value = null
    if (props.sync && syncState) {
      syncState.clearGhostNode()
    }
    return
  }

  const dragData = parseDragData(event)
  if (!dragData || !isDropAllowed(dragData)) {
    // Invalid drop - clear ghost immediately
    localGhostNode.value = null
    if (props.sync && syncState) {
      syncState.clearGhostNode()
    }
    return
  }

  // Convert screen coordinates to flow coordinates
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY
  })

  const flowPosition: FlowPosition = {
    x: Math.round(position.x),
    y: Math.round(position.y)
  }

  // Auto-create node in sync mode if enabled
  if (props.autoCreateOnDrop && props.sync && syncState) {
    const item = dragData.item
    const id = String(item.id || crypto.randomUUID())
    const title = String(item[props.labelField] || 'Untitled')

    syncState.createNode({
      id,
      title,
      parentId: null,
      position: flowPosition,
      data: { ...item }
    })

    // Clear ghost immediately since we created the node
    localGhostNode.value = null
    if (props.sync && syncState) {
      syncState.clearGhostNode()
    }
  } else {
    // When autoCreateOnDrop is false, keep ghost visible as a placeholder
    // while the parent handles the drop asynchronously
    // Update ghost position to exact drop position
    if (localGhostNode.value) {
      localGhostNode.value = {
        ...localGhostNode.value,
        position: flowPosition,
        data: {
          ...localGhostNode.value.data,
          isPending: true // Mark as pending
        }
      }
    }

    // Clear ghost after a delay to allow real node to appear
    // This prevents visual "jump" when ghost disappears before real node appears
    ghostCleanupTimeout = setTimeout(() => {
      localGhostNode.value = null
      if (props.sync && syncState) {
        syncState.clearGhostNode()
      }
      ghostCleanupTimeout = null
    }, 1000) // 1 second should be enough for most async operations
  }

  // Always emit the event for custom handling
  emit('nodeDrop', dragData.item, flowPosition, dragData.collection)
}

// Try to resolve custom node component for this collection
const customNodeComponent = computed(() => {
  const instance = getCurrentInstance()
  if (!instance) return null

  // Convert collection name to PascalCase
  const pascalName = props.collection
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const componentName = `${pascalName}Node`

  // Check if component exists in global registry
  const appComponents = instance.appContext.components

  if (appComponents[componentName]) {
    return resolveComponent(componentName)
  }

  // Check lazy variant
  const lazyName = `Lazy${componentName}`
  if (appComponents[lazyName]) {
    return resolveComponent(lazyName)
  }

  // Use default CroutonFlowNode
  return null
})

// Expose sync state for external access
defineExpose({
  syncState
})
</script>

<template>
  <div
    ref="containerRef"
    class="crouton-flow-container"
    :class="{ 'crouton-flow-drop-target': isDragOver, 'crouton-flow-dark': isDark }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Sync mode overlays -->
    <template v-if="sync && syncState">
      <!-- Connection status indicator -->
      <CroutonFlowConnectionStatus
        :connected="syncState.connected.value"
        :synced="syncState.synced.value"
        :error="syncState.error.value"
      />

      <!-- Presence overlay -->
      <CroutonFlowPresence
        :users="syncState.users.value"
      />
    </template>

    <VueFlow
      :nodes="finalNodes"
      :edges="finalEdges"
      :node-types="nodeTypes"
      :min-zoom="0.1"
      :max-zoom="4"
      :fit-view-on-init="fitViewOnMount"
      class="crouton-vue-flow"
    >
      <!-- Custom or default node template -->
      <template #node-default="nodeProps">
        <!-- Ghost node (drag preview) -->
        <CroutonFlowGhostNode
          v-if="nodeProps.data?.isGhost"
          :data="nodeProps.data"
        />
        <!-- Custom node component -->
        <component
          :is="customNodeComponent"
          v-else-if="customNodeComponent"
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          :dragging="nodeProps.dragging"
          :label="typeof nodeProps.label === 'string' ? nodeProps.label : undefined"
          :collection="collection"
        />
        <!-- Default node -->
        <CroutonFlowNode
          v-else
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          :dragging="nodeProps.dragging"
          :label="typeof nodeProps.label === 'string' ? nodeProps.label : undefined"
          :collection="collection"
        />
      </template>

      <!-- Background -->
      <Background
        v-if="background"
        :pattern-color="'#aaa'"
        :gap="16"
        :variant="backgroundPattern"
      />

      <!-- Controls -->
      <Controls
        v-if="controls"
        position="bottom-left"
      />

      <!-- Minimap -->
      <MiniMap
        v-if="minimap"
        position="bottom-right"
        :pannable="true"
        :zoomable="true"
      />

      <!-- Slot for additional content -->
      <slot />
    </VueFlow>
  </div>
</template>

<style scoped>
.crouton-flow-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background-color: #fafafa;
  border-radius: 0.5rem;
  overflow: hidden;
  position: relative;
}

.crouton-flow-container.crouton-flow-dark {
  background-color: #0a0a0a;
}

.crouton-vue-flow {
  width: 100%;
  height: 100%;
}

.crouton-flow-loading {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.crouton-flow-dark .crouton-flow-loading {
  background-color: #0a0a0a;
}

.crouton-flow-spinner {
  width: 2rem;
  height: 2rem;
  border: 2px solid #d4d4d4;
  border-top-color: #3b82f6;
  border-radius: 9999px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Vue Flow overrides */
:deep(.vue-flow__background) {
  background-color: #fafafa;
}

.crouton-flow-dark :deep(.vue-flow__background) {
  background-color: #0a0a0a;
}

:deep(.vue-flow__edge-path) {
  stroke: #a3a3a3;
}

.crouton-flow-dark :deep(.vue-flow__edge-path) {
  stroke: #525252;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--color-primary-500, #3b82f6);
}

:deep(.vue-flow__controls) {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.crouton-flow-dark :deep(.vue-flow__controls) {
  background: #262626;
  border-color: #404040;
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  color: #525252;
}

.crouton-flow-dark :deep(.vue-flow__controls-button) {
  color: #d4d4d4;
}

:deep(.vue-flow__controls-button:hover) {
  background: #f5f5f5;
}

.crouton-flow-dark :deep(.vue-flow__controls-button:hover) {
  background: #404040;
}

:deep(.vue-flow__minimap) {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.crouton-flow-dark :deep(.vue-flow__minimap) {
  background: #262626;
  border-color: #404040;
}

/* Drop zone styles - subtle border when dragging over */
.crouton-flow-drop-target {
  outline: 2px dashed var(--color-primary-500, #3b82f6);
  outline-offset: -2px;
}
</style>
