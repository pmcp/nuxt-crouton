<script setup lang="ts">
import { computed, onMounted, getCurrentInstance, resolveComponent } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import type { Node, Edge, NodeDragEvent, Connection } from '@vue-flow/core'
import type { CroutonFlowProps, FlowConfig, FlowPosition } from '../types/flow'
import { useFlowData } from '../composables/useFlowData'
import { useFlowLayout } from '../composables/useFlowLayout'
import { useDebouncedPositionUpdate } from '../composables/useFlowMutation'

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
 *
 * @example
 * ```vue
 * <CroutonFlow
 *   :rows="decisions"
 *   collection="decisions"
 *   parent-field="parentId"
 *   position-field="position"
 * />
 * ```
 */

interface Props {
  /** Collection rows to display as nodes */
  rows: Record<string, unknown>[]
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
  fitViewOnMount: true
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

// Convert rows to reactive ref
const rowsRef = computed(() => props.rows)

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

const { applyLayout, needsLayout } = useFlowLayout(layoutOptions.value)

// Position mutation (debounced)
const { debouncedUpdate } = useDebouncedPositionUpdate(
  props.collection,
  props.positionField,
  500
)

// Apply layout to nodes that need it
const layoutedNodes = computed(() => {
  const nodes = dataNodes.value
  const edges = dataEdges.value

  if (needsLayout(nodes)) {
    return applyLayout(nodes, edges)
  }

  return nodes
})

// Use VueFlow instance
const { onNodeDragStop, onNodeClick, onNodeDoubleClick, onEdgeClick, fitView } = useVueFlow()

// Fit view on mount
onMounted(() => {
  if (props.fitViewOnMount) {
    // Small delay to ensure nodes are rendered
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 200 })
    }, 100)
  }
})

// Handle node drag end - persist position
onNodeDragStop((event: NodeDragEvent) => {
  if (!props.draggable) return

  const { node } = event
  const position: FlowPosition = {
    x: Math.round(node.position.x),
    y: Math.round(node.position.y)
  }

  // Persist via debounced mutation
  debouncedUpdate(node.id, position)

  // Emit event
  emit('nodeMove', node.id, position)
})

// Handle node click
onNodeClick(({ node }) => {
  const item = getItem(node.id)
  if (item) {
    emit('nodeClick', node.id, item)
  }
})

// Handle node double-click
onNodeDoubleClick(({ node }) => {
  const item = getItem(node.id)
  if (item) {
    emit('nodeDblClick', node.id, item)
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
</script>

<template>
  <div class="crouton-flow-container">
    <VueFlow
      :nodes="layoutedNodes"
      :edges="dataEdges"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :min-zoom="0.1"
      :max-zoom="4"
      :nodes-draggable="draggable"
      :snap-to-grid="true"
      :snap-grid="[10, 10]"
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
          :label="nodeProps.label"
        />
        <CroutonFlowNode
          v-else
          :data="nodeProps.data"
          :selected="nodeProps.selected"
          :dragging="nodeProps.dragging"
          :label="nodeProps.label"
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
@reference "tailwindcss";

.crouton-flow-container {
  @apply w-full h-full min-h-[400px];
  @apply bg-neutral-50 dark:bg-neutral-950;
  @apply rounded-lg overflow-hidden;
}

.crouton-vue-flow {
  @apply w-full h-full;
}

/* Vue Flow overrides for dark mode */
:deep(.vue-flow__background) {
  @apply dark:bg-neutral-950;
}

:deep(.vue-flow__edge-path) {
  @apply stroke-neutral-400 dark:stroke-neutral-600;
}

:deep(.vue-flow__edge.selected .vue-flow__edge-path) {
  stroke: var(--color-primary-500);
}

:deep(.vue-flow__controls) {
  @apply bg-white dark:bg-neutral-800;
  @apply border border-neutral-200 dark:border-neutral-700;
  @apply rounded-lg shadow-sm;
}

:deep(.vue-flow__controls-button) {
  @apply bg-transparent;
  @apply text-neutral-600 dark:text-neutral-300;
  @apply hover:bg-neutral-100 dark:hover:bg-neutral-700;
}

:deep(.vue-flow__minimap) {
  @apply bg-white dark:bg-neutral-800;
  @apply border border-neutral-200 dark:border-neutral-700;
  @apply rounded-lg shadow-sm;
}
</style>
