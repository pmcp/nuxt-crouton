<script setup lang="ts">
import { computed, getCurrentInstance, resolveComponent, ref, watch } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, NodeDragEvent } from '@vue-flow/core'
import type { CroutonFlowProps, FlowConfig, FlowPosition } from '../types/flow'
import type { YjsFlowNode } from '../types/yjs'
import { useFlowData } from '../composables/useFlowData'
import { useFlowLayout } from '../composables/useFlowLayout'
import { useDebouncedPositionUpdate } from '../composables/useFlowMutation'
import { useFlowSync } from '../composables/useFlowSync'
import CroutonFlowNode from './Node.vue'

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
      parentId: node.parentId,
    },
    label: node.title,
  }))
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

// Use sync nodes or legacy nodes based on mode
const finalNodes = computed(() => {
  if (props.sync && syncState) {
    // Apply layout if needed for sync nodes too
    const nodes = syncNodes.value
    const edges = syncEdges.value

    if (needsLayout(nodes)) {
      return applyLayout(nodes, edges)
    }
    return nodes
  }
  return layoutedNodes.value
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
  onNodeDragStop,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
} = useVueFlow()

// Handle node drag end - persist position
onNodeDragStop((event: NodeDragEvent) => {
  if (!props.draggable) return

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
  }

  if (props.sync && syncState) {
    // Use Yjs for sync mode
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
  <div ref="containerRef" class="crouton-flow-container">
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
      :min-zoom="0.1"
      :max-zoom="4"
      fit-view-on-init
      class="crouton-vue-flow"
    >
      <!-- Custom or default node template -->
      <template #node-default="nodeProps">
        <component
          v-if="customNodeComponent"
          :is="customNodeComponent"
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          :dragging="nodeProps.dragging"
          :label="typeof nodeProps.label === 'string' ? nodeProps.label : undefined"
        />
        <CroutonFlowNode
          v-else
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          :dragging="nodeProps.dragging"
          :label="typeof nodeProps.label === 'string' ? nodeProps.label : undefined"
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
</style>
