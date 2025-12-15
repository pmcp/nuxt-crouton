<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, ref, resolveComponent, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import type { CroutonFlowProps, FlowConfig, FlowPosition, CroutonDragData } from '../types/flow'
import type { YjsFlowNode } from '../types/yjs'
import { useFlowData } from '../composables/useFlowData'
import { useFlowLayout } from '../composables/useFlowLayout'
import { useDebouncedPositionUpdate } from '../composables/useFlowMutation'
import { useFlowSync } from '../composables/useFlowSync'
import CroutonFlowNode from './Node.vue'
import CroutonFlowGhostNode from './GhostNode.vue'
import { markRaw } from 'vue'

// Register custom node types for VueFlow
const nodeTypes = {
  ghost: markRaw(CroutonFlowGhostNode),
}

// Import default styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

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
  autoCreateOnDrop: true,
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

// ============================================
// SYNC MODE: Use Yjs for real-time sync
// ============================================
const syncState = props.sync && props.flowId
  ? useFlowSync({
      flowId: props.flowId,
      collection: props.collection,
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
        console.log('[CroutonFlow] Yjs already has', syncState.nodes.value.length, 'nodes from server, marking as seeded')
        seeded.value = true
        return
      }

      // Yjs doc is empty but we have rows - seed it
      if (props.rows && props.rows.length > 0) {
        console.log('[CroutonFlow] Seeding Yjs doc from rows:', props.rows.length, 'items')
        console.log('[CroutonFlow] First row sample:', JSON.stringify(props.rows[0], null, 2))
        console.log('[CroutonFlow] positionField:', props.positionField)

        for (const row of props.rows) {
          const id = String(row.id || crypto.randomUUID())
          const title = String(row[props.labelField] || 'Untitled')
          const parentId = row[props.parentField] as string | null | undefined
          const rawPosition = row[props.positionField]

          console.log('[CroutonFlow] Row position data:', {
            id,
            rawPosition,
            typeofRawPosition: typeof rawPosition,
          })

          // Handle position - could be string JSON, object, or undefined
          let position: FlowPosition | null = null
          if (rawPosition) {
            if (typeof rawPosition === 'string') {
              try {
                position = JSON.parse(rawPosition)
              }
              catch {
                console.warn('[CroutonFlow] Failed to parse position string:', rawPosition)
              }
            }
            else if (typeof rawPosition === 'object' && 'x' in rawPosition && 'y' in rawPosition) {
              position = rawPosition as FlowPosition
            }
          }

          const finalPosition = position || { x: 0, y: 0 }
          console.log('[CroutonFlow] Final position:', finalPosition)

          syncState.createNode({
            id,
            title,
            parentId: parentId || null,
            position: finalPosition,
            data: { ...row },
          })
        }
        seeded.value = true
      }
    }
  },
  { immediate: true },
)

// Watch for new/updated items in rows and sync them to Yjs
// Watch both seeded state AND rows to trigger when either changes
watch(
  () => ({
    rows: props.rows,
    length: props.rows?.length ?? 0,
    seeded: seeded.value,
  }),
  ({ rows: newRows, seeded: isSeeded }) => {
    console.log('[CroutonFlow] rows watcher triggered:', {
      newRowsLength: newRows?.length,
      seeded: isSeeded,
      hasSyncState: !!syncState,
    })

    if (!syncState || !isSeeded || !newRows) {
      console.log('[CroutonFlow] rows watcher early return:', {
        noSyncState: !syncState,
        notSeeded: !isSeeded,
        noNewRows: !newRows,
      })
      return
    }

    // Get existing nodes from Yjs as a map for quick lookup
    const existingNodes = new Map(syncState.nodes.value.map(n => [n.id, n]))
    console.log('[CroutonFlow] Comparing rows to Yjs:', {
      rowsCount: newRows.length,
      yjsNodesCount: existingNodes.size,
    })

    // Sync rows to Yjs (add new, update existing)
    let addedCount = 0
    let updatedCount = 0
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
          }
          catch { /* ignore */ }
        }
        else if (typeof rawPosition === 'object' && 'x' in rawPosition && 'y' in rawPosition) {
          position = rawPosition as FlowPosition
        }
      }

      const existingNode = existingNodes.get(id)
      if (!existingNode) {
        // New item - add to Yjs
        console.log('[CroutonFlow] New item detected, adding to Yjs:', id)
        syncState.createNode({
          id,
          title,
          parentId: parentId || null,
          position: position || { x: 0, y: 0 },
          data: { ...row },
        })
        addedCount++
      }
      else {
        // Existing item - check if data changed (compare title, parentId, and data)
        const titleChanged = existingNode.title !== title
        const parentChanged = existingNode.parentId !== (parentId || null)
        // Compare data by checking key fields (exclude position which is managed by Yjs)
        const dataChanged = JSON.stringify({ ...existingNode.data, [props.positionField]: undefined })
          !== JSON.stringify({ ...row, [props.positionField]: undefined })

        if (titleChanged || parentChanged || dataChanged) {
          console.log('[CroutonFlow] Item updated, syncing to Yjs:', id, {
            titleChanged,
            parentChanged,
            dataChanged,
          })
          syncState.updateNode(id, {
            title,
            parentId: parentId || null,
            data: { ...row },
          })
          updatedCount++
        }
      }
    }

    // Handle deletions - remove nodes from Yjs that are no longer in rows
    const rowIds = new Set(newRows.map(r => String(r.id)))
    let deletedCount = 0
    for (const [nodeId] of existingNodes) {
      if (!rowIds.has(nodeId)) {
        console.log('[CroutonFlow] Item deleted, removing from Yjs:', nodeId)
        syncState.deleteNode(nodeId)
        deletedCount++
      }
    }

    if (addedCount > 0 || updatedCount > 0 || deletedCount > 0) {
      console.log('[CroutonFlow] Synced to Yjs:', { added: addedCount, updated: updatedCount, deleted: deletedCount })
    }
  },
  { deep: true, immediate: true },
)

// Convert sync nodes to Vue Flow format
const syncNodes = computed<Node[]>(() => {
  if (!syncState) return []

  const nodes = syncState.nodes.value.map((node: YjsFlowNode) => ({
    id: node.id,
    type: 'default',
    position: node.position,
    data: {
      ...node.data,
      id: node.id,
      title: node.title,
      parentId: node.parentId,
    },
    label: node.title,
  }))

  console.log('[CroutonFlow] syncNodes computed:', nodes.length, 'nodes')
  if (nodes.length > 0) {
    console.log('[CroutonFlow] First syncNode:', JSON.stringify(nodes[0], null, 2))
  }

  return nodes
})

// Generate edges from sync nodes
const syncEdges = computed(() => {
  if (!syncState) return []

  const result: { id: string; source: string; target: string; type: string }[] = []
  const nodeIds = new Set(syncState.nodes.value.map((n: YjsFlowNode) => n.id))

  for (const node of syncState.nodes.value) {
    if (node.parentId && nodeIds.has(node.parentId)) {
      result.push({
        id: `e-${node.parentId}-${node.id}`,
        source: node.parentId,
        target: node.id,
        type: 'default',
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
      type: 'ghost',
      position: u.ghostNode!.position,
      data: {
        title: u.ghostNode!.title,
        userName: u.user.name,
        userColor: u.user.color,
      },
      draggable: false,
      selectable: false,
    }))
})

// ============================================
// LEGACY MODE: Use props-based data
// ============================================

// Convert rows to reactive ref
const rowsRef = computed(() => props.rows || [])

// Convert rows to nodes and edges
const { nodes: dataNodes, edges: dataEdges, getItem } = useFlowData(
  rowsRef,
  {
    parentField: props.parentField,
    positionField: props.positionField,
    labelField: props.labelField,
  },
)

// Layout utilities
const layoutOptions = computed(() => ({
  direction: props.flowConfig?.direction ?? 'TB',
  nodeSpacing: props.flowConfig?.nodeSpacing ?? 50,
  rankSpacing: props.flowConfig?.rankSpacing ?? 100,
}))

const { applyLayout, needsLayout } = useFlowLayout(layoutOptions.value)

// Position mutation (debounced) - only for legacy mode
const { debouncedUpdate } = useDebouncedPositionUpdate(
  props.collection,
  props.positionField,
  500,
)

// Apply layout to nodes that need it (legacy mode only)
const layoutedNodes = computed(() => {
  const nodes = dataNodes.value
  const edges = dataEdges.value

  let result
  if (needsLayout(nodes)) {
    result = applyLayout(nodes, edges)
  }
  else {
    result = nodes
  }

  return result
})

// ============================================
// FINAL COMPUTED VALUES
// ============================================

// Track if we've applied initial layout to Yjs
const layoutAppliedToYjs = ref(false)

// Use sync nodes or legacy nodes based on mode
const finalNodes = computed(() => {
  let baseNodes: Node[]

  if (props.sync && syncState) {
    // Apply layout if needed for sync nodes too
    const nodes = syncNodes.value
    const edges = syncEdges.value

    console.log('[CroutonFlow] finalNodes: checking layout for', nodes.length, 'nodes')
    const needsLayoutResult = needsLayout(nodes)
    console.log('[CroutonFlow] needsLayout:', needsLayoutResult, 'layoutAppliedToYjs:', layoutAppliedToYjs.value)

    if (needsLayoutResult && !layoutAppliedToYjs.value) {
      const layoutedNodesResult = applyLayout(nodes, edges)
      console.log('[CroutonFlow] After layout, first node:', layoutedNodesResult[0] ? JSON.stringify(layoutedNodesResult[0].position) : 'none')

      // Write layout positions back to Yjs so they persist
      // Use nextTick to avoid updating during render
      nextTick(() => {
        console.log('[CroutonFlow] Writing layout positions back to Yjs')
        for (const node of layoutedNodesResult) {
          if (node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') {
            syncState.updatePosition(node.id, node.position)
          }
        }
        layoutAppliedToYjs.value = true
      })

      baseNodes = layoutedNodesResult
    }
    else {
      baseNodes = nodes
    }
  }
  else {
    baseNodes = layoutedNodes.value
  }

  // Include ghost nodes (local + remote)
  const ghosts: Node[] = [
    ...(localGhostNode.value ? [localGhostNode.value] : []),
    ...remoteGhostNodes.value,
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
  screenToFlowCoordinate,
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
    y: Math.round(node.position.y),
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
    y: Math.round(node.position.y),
  }

  if (props.sync && syncState) {
    // Final sync to Yjs
    syncState.updatePosition(node.id, position)
  }
  else {
    // Persist via debounced mutation (legacy mode)
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
  }
  else {
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
  }
  else {
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
  }
  catch {
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
    y: event.clientY,
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
      userColor,
    },
    draggable: false,
    selectable: false,
  }
  // Broadcast to other users (throttled) in sync mode
  const now = Date.now()
  if (props.sync && syncState && now - lastGhostSync >= GHOST_SYNC_THROTTLE) {
    lastGhostSync = now
    syncState.updateGhostNode({
      id: `ghost-${syncState.user.value?.id}`,
      title: 'New Node',
      collection: props.collection,
      position: { x: Math.round(position.x), y: Math.round(position.y) },
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

  // Clear ghost node immediately
  localGhostNode.value = null
  if (props.sync && syncState) {
    syncState.clearGhostNode()
  }

  if (!props.allowDrop) return

  const dragData = parseDragData(event)
  if (!dragData || !isDropAllowed(dragData)) return

  // Convert screen coordinates to flow coordinates
  const position = screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  const flowPosition: FlowPosition = {
    x: Math.round(position.x),
    y: Math.round(position.y),
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
      data: { ...item },
    })
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
  syncState,
})
</script>

<template>
  <div
    ref="containerRef"
    class="crouton-flow-container"
    :class="{ 'crouton-flow-drop-target': isDragOver }"
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
          v-else-if="customNodeComponent"
          :is="customNodeComponent"
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
      <Background v-if="background" :pattern-color="'#aaa'" :gap="16" :variant="backgroundPattern" />

      <!-- Controls -->
      <Controls v-if="controls" position="bottom-left" />

      <!-- Minimap -->
      <MiniMap v-if="minimap" position="bottom-right" :pannable="true" :zoomable="true" />

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

.dark .crouton-flow-container {
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

.dark .crouton-flow-loading {
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

.dark :deep(.vue-flow__background) {
  background-color: #0a0a0a;
}

:deep(.vue-flow__edge-path) {
  stroke: #a3a3a3;
}

.dark :deep(.vue-flow__edge-path) {
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

.dark :deep(.vue-flow__controls) {
  background: #262626;
  border-color: #404040;
}

:deep(.vue-flow__controls-button) {
  background: transparent;
  color: #525252;
}

.dark :deep(.vue-flow__controls-button) {
  color: #d4d4d4;
}

:deep(.vue-flow__controls-button:hover) {
  background: #f5f5f5;
}

.dark :deep(.vue-flow__controls-button:hover) {
  background: #404040;
}

:deep(.vue-flow__minimap) {
  background: white;
  border: 1px solid #e5e5e5;
  border-radius: 0.5rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark :deep(.vue-flow__minimap) {
  background: #262626;
  border-color: #404040;
}

/* Drop zone styles - subtle border when dragging over */
.crouton-flow-drop-target {
  outline: 2px dashed var(--color-primary-500, #3b82f6);
  outline-offset: -2px;
}
</style>
