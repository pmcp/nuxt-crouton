<script setup lang="ts">
import { computed, nextTick, ref, resolveComponent, watch, markRaw } from 'vue'
import { useThrottleFn } from '@vueuse/core'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import type { FlowConfig, FlowPosition, FlowDataMode, NodeTypeRegistration, FlowContainerOptions } from '../types/flow'
import { useFlowData } from '../composables/useFlowData'
import { useFlowLayout } from '../composables/useFlowLayout'
import { useDebouncedPositionUpdate } from '../composables/useFlowMutation'
import { useFlowPositionStore } from '../composables/useFlowPositionStore'
import { useFlowPositionSync } from '../composables/useFlowPositionSync'
import { useFlowSync } from '../composables/useFlowSync'
import { useFlowDragDrop } from '../composables/useFlowDragDrop'
import { useFlowSyncBridge } from '../composables/useFlowSyncBridge'
import { useFlowContainerDetection, type ContainerChangeEvent } from '../composables/useFlowContainerDetection'
import CroutonFlowNode from './Node.vue'
import CroutonFlowGhostNode from './GhostNode.vue'

// Import default styles
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import '@vue-flow/minimap/dist/style.css'

// Note: nodeTypes is built dynamically below after props are defined

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
  /** Custom node type components (key = node type string, value = component + isContainer flag) */
  nodeTypeComponents?: Record<string, NodeTypeRegistration>
  /** Container detection options — enable card-over-group overlap detection on drag stop */
  containerOptions?: FlowContainerOptions
  /** Data mode: 'collection' (default) or 'ephemeral' (skip collection mutations) */
  dataMode?: FlowDataMode
  /** Pre-loaded node positions from flow_configs (avoids extra fetch) */
  savedPositions?: Record<string, { x: number; y: number }> | null
  /** Selected node IDs (enables v-model:selected) */
  selected?: string[]
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
  dataMode: 'collection',
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
  /** Emitted when a node's container assignment changes (drag into/out of group) */
  nodeContainerChange: [event: ContainerChangeEvent]
  /** Emitted when nodes are deleted (keyboard delete or programmatic removal) */
  nodeDelete: [nodeIds: string[]]
  /** Emitted in ephemeral mode when nodes change (enables v-model:rows) */
  'update:rows': [rows: Record<string, unknown>[]]
  /** Emitted when selection changes (enables v-model:selected) */
  'update:selected': [selectedNodeIds: string[]]
}>()

// Validate props
if (props.sync && !props.flowId) {
  console.warn('[CroutonFlow] flowId is required when sync mode is enabled')
}

// Container ref for drag-leave detection
const containerRef = ref<HTMLElement | null>(null)

// Dark mode detection - useColorMode is auto-imported by Nuxt
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// ============================================
// SYNC MODE: Initialize real-time sync
// ============================================
// Full sync: stores all node data in Yjs (collection mode)
// Position sync: only positions in Yjs (ephemeral mode)
const syncState = (props.sync && props.flowId && props.dataMode !== 'ephemeral')
  ? useFlowSync({
      flowId: props.flowId,
      collection: props.collection
    })
  : null

const positionSync = (props.sync && props.flowId && props.dataMode === 'ephemeral')
  ? useFlowPositionSync({ flowId: props.flowId })
  : null

// ============================================
// DYNAMIC NODE TYPES
// ============================================
// Merge built-in ghost type with user-provided node type components
const nodeTypes = computed(() => {
  const types: Record<string, any> = {
    ghost: markRaw(CroutonFlowGhostNode),
  }
  if (props.nodeTypeComponents) {
    for (const [typeName, reg] of Object.entries(props.nodeTypeComponents)) {
      types[typeName] = markRaw(reg.component)
    }
  }
  return types
})

// ============================================
// CONTAINER DETECTION
// ============================================
const containerDetection = props.containerOptions?.enabled && props.nodeTypeComponents
  ? useFlowContainerDetection({ nodeTypeComponents: props.nodeTypeComponents })
  : null

// ============================================
// VUEFLOW INSTANCE
// ============================================
const {
  onNodeDrag,
  onNodeDragStop,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
  onNodesChange,
  screenToFlowCoordinate,
  getSelectedNodes,
  addSelectedNodes,
  removeSelectedNodes,
  findNode
} = useVueFlow()

// Flag to prevent emit loops when syncing selected prop to Vue Flow
const isSyncingFromProp = ref(false)

// Detect node removals (keyboard delete) and emit nodeDelete
// Also detect selection changes and emit update:selected
onNodesChange((changes) => {
  const removedIds = changes
    .filter((c) => c.type === 'remove')
    .map((c) => c.id)
  if (removedIds.length > 0) {
    // Clean up position cache for removed nodes
    for (const id of removedIds) positionCache.delete(id)
    emit('nodeDelete', removedIds)
  }

  // Detect selection changes and emit update:selected
  // Skip emitting when we're syncing from the selected prop to avoid loops
  const hasSelectionChange = changes.some((c) => c.type === 'select')
  if (hasSelectionChange && !isSyncingFromProp.value) {
    const selectedIds = getSelectedNodes.value.map((n) => n.id)
    emit('update:selected', selectedIds)
    emit('selectionChange', selectedIds)
  }
})

// Watch the selected prop and sync to Vue Flow when parent changes it externally
watch(() => props.selected, (newSelected) => {
  if (!newSelected) return
  isSyncingFromProp.value = true

  const currentSelectedIds = new Set(getSelectedNodes.value.map((n) => n.id))
  const targetSelectedIds = new Set(newSelected)

  // Remove nodes that should no longer be selected
  const toDeselect = getSelectedNodes.value.filter((n) => !targetSelectedIds.has(n.id))
  if (toDeselect.length > 0) {
    removeSelectedNodes(toDeselect)
  }

  // Add nodes that should be selected but aren't yet
  const toSelect = newSelected
    .filter((id) => !currentSelectedIds.has(id))
    .map((id) => findNode(id))
    .filter(Boolean) as Node[]
  if (toSelect.length > 0) {
    addSelectedNodes(toSelect)
  }

  nextTick(() => { isSyncingFromProp.value = false })
}, { deep: true })

// ============================================
// DRAG & DROP (external items onto canvas)
// ============================================
const {
  isDragOver,
  localGhostNode,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  stopGhostCleanup
} = useFlowDragDrop(props, {
  syncState,
  containerRef,
  screenToFlowCoordinate,
  onDrop: (item, position, collection) => emit('nodeDrop', item, position, collection)
})

// ============================================
// SYNC BRIDGE (Yjs ↔ Vue Flow conversion)
// ============================================
const {
  syncNodes,
  syncEdges,
  otherUsersInRoom,
  remoteGhostNodes
} = useFlowSyncBridge({
  syncState,
  rows: computed(() => props.rows),
  labelField: props.labelField,
  parentField: props.parentField,
  positionField: props.positionField,
  localGhostNode,
  stopGhostCleanup
})

// Position sync: filter other users for presence display
const positionSyncOtherUsers = computed(() => {
  if (!positionSync) return []
  const currentId = positionSync.user.value?.id
  return positionSync.users.value.filter(u => u.user?.id !== currentId)
})

// ============================================
// STANDALONE MODE: Props-based data
// ============================================
const rowsRef = computed(() => props.rows || [])

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
  rankSpacing: props.flowConfig?.rankSpacing ?? 100,
  nodeWidth: props.flowConfig?.nodeWidth ?? 172,
  nodeHeight: props.flowConfig?.nodeHeight ?? 36,
}))

const { applyLayout, applyLayoutToNew, needsLayout } = useFlowLayout(layoutOptions.value)

// Position persistence strategy:
// 1. sync + ephemeral → Yjs position-only sync (real-time multiplayer)
// 2. flowId without sync → save to flow_configs.nodePositions (REST)
// 3. collection mode without flowId → PATCH collection row's position field
// 4. ephemeral without flowId/sync → no persistence
const { debouncedUpdate } = positionSync
  ? positionSync
  : (props.flowId && !props.sync)
    ? useFlowPositionStore(props.flowId!)
    : (props.dataMode !== 'ephemeral')
      ? useDebouncedPositionUpdate(props.collection, props.positionField, 500)
      : { debouncedUpdate: () => {} }

// Apply saved positions from flow_configs (if provided)
const positionedNodes = computed(() => {
  if (!props.savedPositions) return dataNodes.value
  return dataNodes.value.map((node) => {
    const saved = props.savedPositions![node.id]
    if (saved) {
      return { ...node, position: saved, _needsLayout: undefined }
    }
    return node
  })
})

// Position cache: remembers node positions across data refreshes
// When rows update (CRUD), nodes get recreated at (0,0) because collection
// data has no position field. This cache preserves last known positions.
const positionCache = new Map<string, { x: number; y: number }>()

const cachedNodes = computed(() => {
  return positionedNodes.value.map((node) => {
    // If node already has a valid position from data, use it
    if (node.position && (node.position.x !== 0 || node.position.y !== 0)) {
      return node
    }
    // Otherwise, restore from cache if available
    const cached = positionCache.get(node.id)
    if (cached) {
      return { ...node, position: cached, _needsLayout: undefined }
    }
    return node
  })
})

// Apply layout to standalone nodes (once on initial load, or when new nodes appear at 0,0)
const initialLayoutApplied = ref(false)
const layoutedNodes = computed(() => {
  const nodes = cachedNodes.value
  const edges = dataEdges.value

  if (!initialLayoutApplied.value && needsLayout(nodes)) {
    const result = applyLayout(nodes, edges)
    // Cache the layout positions
    for (const node of result) {
      if (node.position) positionCache.set(node.id, { ...node.position })
    }
    nextTick(() => { initialLayoutApplied.value = true })
    return result
  }

  // Check if any nodes are at (0,0) after initial layout — these are newly added nodes
  if (initialLayoutApplied.value && nodes.some(n => !n.position || (n.position.x === 0 && n.position.y === 0))) {
    const result = applyLayoutToNew(nodes, edges)
    // Cache new positions
    for (const node of result) {
      if (node.position && !positionCache.has(node.id)) {
        positionCache.set(node.id, { ...node.position })
      }
    }
    return result
  }

  return nodes
})

// ============================================
// FINAL COMPUTED VALUES
// ============================================

const layoutAppliedToYjs = ref(false)
const ephemeralPositionsApplied = ref(false)

const finalNodes = computed(() => {
  let baseNodes: Node[]

  if (props.dataMode === 'ephemeral') {
    // Ephemeral mode: rows are pre-built Vue Flow nodes
    let ephemeralNodes = (props.rows || []) as unknown as Node[]

    if (positionSync) {
      // Yjs position sync: apply positions reactively from Y.Map
      const yjsPositions = positionSync.positions.value
      if (Object.keys(yjsPositions).length > 0) {
        ephemeralNodes = ephemeralNodes.map((node) => {
          const saved = yjsPositions[node.id]
          if (saved) {
            return { ...node, position: saved }
          }
          return node
        })
      }
    } else if (props.savedPositions && !ephemeralPositionsApplied.value) {
      // REST position store: apply saved positions once on initial load
      ephemeralNodes = ephemeralNodes.map((node) => {
        const saved = props.savedPositions![node.id]
        if (saved) {
          return { ...node, position: saved }
        }
        return node
      })
      if (ephemeralNodes.length > 0) {
        ephemeralPositionsApplied.value = true
      }
    }
    baseNodes = ephemeralNodes
  } else if (props.sync && syncState) {
    const nodes = syncNodes.value
    const edges = syncEdges.value
    const needsLayoutResult = needsLayout(nodes)

    if (needsLayoutResult && !layoutAppliedToYjs.value) {
      const layoutedNodesResult = applyLayout(nodes, edges)

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
  if (props.dataMode === 'ephemeral') {
    // Ephemeral mode has no edges (container relationships via parentNode, not edges)
    return []
  }
  if (props.sync && syncState) {
    return syncEdges.value
  }
  return dataEdges.value
})

// ============================================
// EVENT HANDLERS
// ============================================

// Handle node drag - sync position in real-time (throttled to 50ms)
const syncDragPosition = useThrottleFn((event: NodeDragEvent) => {
  if (!props.draggable || !props.sync) return

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }

  if (syncState) {
    syncState.updatePosition(node.id, position)
  } else if (positionSync) {
    positionSync.debouncedUpdate(node.id, position)
  }
}, 50)

onNodeDrag(syncDragPosition)

// Handle node drag end - final position sync + container detection
onNodeDragStop((event: NodeDragEvent) => {
  if (!props.draggable) return

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }

  // Container detection (if enabled)
  if (containerDetection) {
    const result = containerDetection.handleDragStop(finalNodes.value, event)
    if (result) {
      emit('nodeContainerChange', result.change)
      // In ephemeral mode, the parent manages nodes; don't persist to collection
      // The event handler is responsible for updating the nodes array
    }
  }

  // Update position cache so data refreshes don't reset this node
  positionCache.set(node.id, { ...position })

  if (props.sync && syncState) {
    syncState.updatePosition(node.id, position)
  } else {
    debouncedUpdate(node.id, position)
  }

  // In ephemeral mode, emit updated rows so parent can track position changes
  if (props.dataMode === 'ephemeral' && props.rows) {
    const updatedRows = props.rows.map(r =>
      (r as any).id === node.id ? { ...r, position } : r,
    )
    emit('update:rows', updatedRows)
  }

  emit('nodeMove', node.id, position)
})

// Handle node click
onNodeClick(({ node }) => {
  if (props.dataMode === 'ephemeral') {
    emit('nodeClick', node.id, node.data as Record<string, unknown>)
  } else if (props.sync && syncState) {
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
// CUSTOM NODE RESOLUTION
// ============================================

// Try to resolve custom node component for this collection.
// resolveComponent returns a string (the component name) when not found in dev,
// or throws in production. We check the return type to detect presence.
const customNodeComponent = computed(() => {
  const pascalName = props.collection
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

  const componentName = `${pascalName}Node`

  const resolved = resolveComponent(componentName)
  if (typeof resolved !== 'string') return resolved

  const lazyResolved = resolveComponent(`Lazy${componentName}`)
  if (typeof lazyResolved !== 'string') return lazyResolved

  return null
})

// Expose sync state and container detection for external access
defineExpose({
  syncState,
  containerDetection,
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
    <!-- Sync mode overlays (uses crouton-collab components) -->
    <template v-if="sync && syncState">
      <!-- Connection status indicator (bottom-left) -->
      <div class="crouton-flow-status">
        <CollabStatus
          :connected="syncState.connected.value"
          :synced="syncState.synced.value"
          :error="syncState.error.value"
          :show-label="false"
        />
      </div>

      <!-- Presence avatars (top-right) -->
      <div class="crouton-flow-presence">
        <CollabPresence
          :users="otherUsersInRoom"
          :max-visible="5"
          size="sm"
        />
      </div>

      <!-- Remote cursors overlay -->
      <CollabCursors
        :users="otherUsersInRoom"
        :show-labels="true"
      />
    </template>

    <!-- Position sync mode overlays (ephemeral + sync) -->
    <template v-if="positionSync">
      <div class="crouton-flow-status">
        <CollabStatus
          :connected="positionSync.connected.value"
          :synced="positionSync.synced.value"
          :error="positionSync.error.value"
          :show-label="false"
        />
      </div>

      <div class="crouton-flow-presence">
        <CollabPresence
          :users="positionSyncOtherUsers"
          :max-visible="5"
          size="sm"
        />
      </div>
    </template>

    <VueFlow
      :nodes="finalNodes"
      :edges="finalEdges"
      :node-types="nodeTypes"
      :default-edge-options="{ type: props.flowConfig?.edgeType || 'default' }"
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
:deep(.vue-flow__node-default) {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
}

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

/* Collab overlay positioning */
.crouton-flow-status {
  position: absolute;
  bottom: 12px;
  left: 12px;
  z-index: 100;
}

.crouton-flow-presence {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
}
</style>
