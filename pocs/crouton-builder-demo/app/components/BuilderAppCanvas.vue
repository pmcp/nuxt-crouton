<script setup lang="ts">
/**
 * BuilderAppCanvas (#939) — the App level (L1/L2) of the Crouton Builder zoom flow,
 * rebuilt on the #903 spike's Vue Flow canvas instead of the clipped compose cards.
 *
 *   zoom into a page → THIS canvas (its components as Vue Flow nodes) → arrange / add
 *
 * `v-model`s a `LayoutTree` via the flow-nodes↔tree bridge: it seeds nodes from the tree
 * on NAVIGATION only (keyed by `seedKey`, so an in-place edit doesn't re-explode the
 * canvas), and every arrangement (drop a block · drag to rearrange) recomposes the tree
 * and emits it — the same tree the Breakpoints level reads when you zoom further in.
 *
 * Magic-arrange (#908/#909) is deliberately NOT here yet — it's one future button on
 * this canvas, built last.
 */
import { computed, markRaw, ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import type { LayoutNode, LayoutTree } from '@fyit/crouton-core/app/types/layout'
import type { NodePath } from '@fyit/crouton-layout/app/utils/layout-edit'
import BuilderAppNode from './BuilderAppNode.vue'
import { treeToFlowNodes, flowNodesToTree, flowNodePath, type FlowLayoutNode } from '../utils/flow-layout-bridge'

const props = defineProps<{
  /** The focused frame's layout tree (the page, or a nested app). */
  modelValue: LayoutTree
  /** A stable navigation key (`depth:level:label`). Re-seed the canvas only when it changes. */
  seedKey: string
}>()
const emit = defineEmits<{
  'update:modelValue': [tree: LayoutTree]
  zoom: [path: NodePath]
}>()

const nodeComp = markRaw(BuilderAppNode)

// The drawer = the components you can add to this page. Backend-free demo blocks from the
// registry (the KPI-backed ones render legibly without auth), like the spike's drawer.
const appConfig = useAppConfig()
const palette = computed(() =>
  Object.values((appConfig.croutonLayoutBlocks ?? {}) as Record<string, { id: string, name: string, icon?: string, component?: string }>)
    .filter(b => b.component === 'CroutonLayoutSpikeStats')
    .map(b => ({ id: b.id, name: b.name, icon: b.icon || 'i-lucide-box' })),
)

const { width: winW } = useWindowSize()
const flowNodes = ref<FlowLayoutNode[]>([])

// Seed from the focused tree on NAVIGATION only — keyed on the stable `seedKey`, so an
// in-place edit (which re-emits the tree at the same depth/level) does NOT re-explode the
// nodes the user just arranged. Zooming in/out (seedKey changes) re-seeds.
watch(
  () => props.seedKey,
  () => { flowNodes.value = treeToFlowNodes(props.modelValue, { column: !!winW.value && winW.value < 560 }) },
  { immediate: true },
)

function commit() {
  emit('update:modelValue', flowNodesToTree(flowNodes.value, props.modelValue))
}

// --- drawer drag-source → CroutonFlow drop -----------------------------------
let seq = 0
function onDragStart(e: DragEvent, block: { id: string, name: string }) {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    type: 'crouton-item',
    collection: 'builder',
    item: { id: `${block.id}-${++seq}`, blockId: block.id, label: block.name },
  }))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}
function onNodeDrop(item: Record<string, unknown>, position: { x: number, y: number }) {
  const blockId = String(item.blockId)
  const node: LayoutNode = { type: 'leaf', blockId }
  flowNodes.value = [...flowNodes.value, {
    id: String(item.id),
    type: 'default',
    position,
    data: { node, label: String(item.label ?? blockId) },
  }]
  commit()
}

/** A drag (rearrange) settled → CroutonFlow re-emits rows with new positions → recompose. */
function onRows(rows: Record<string, unknown>[]) {
  flowNodes.value = rows as unknown as FlowLayoutNode[]
  commit()
}

/** Double-click a nested-app card → descend into its sub-layout (pane-click-to-zoom). */
function onDblClick(nodeId: string) {
  const fn = flowNodes.value.find(n => n.id === nodeId)
  if (fn?.data.node?.type === 'nested') {
    const path = flowNodePath(flowNodes.value, nodeId)
    if (path) emit('zoom', path)
  }
}
</script>

<template>
  <div class="flex h-full w-full">
    <!-- Drawer — components you can add to this page -->
    <aside class="flex w-44 shrink-0 flex-col gap-2 overflow-y-auto border-r border-default bg-elevated/40 p-3">
      <p class="text-[10px] uppercase tracking-widest text-muted">Add a component</p>
      <div
        v-for="b in palette"
        :key="b.id"
        draggable="true"
        class="flex cursor-grab items-center gap-2 rounded-lg border border-default bg-default px-2.5 py-2 text-xs transition-colors hover:border-primary active:cursor-grabbing"
        @dragstart="onDragStart($event, b)"
      >
        <UIcon
          :name="b.icon"
          class="size-3.5 text-primary"
        />
        <span class="truncate">{{ b.name }}</span>
        <UIcon
          name="i-lucide-grip-vertical"
          class="ml-auto size-3 text-muted"
        />
      </div>
    </aside>

    <!-- The Vue Flow canvas — the page's components as nodes -->
    <div class="relative min-w-0 flex-1">
      <ClientOnly>
        <CroutonFlow
          :rows="flowNodes"
          collection="builder"
          data-mode="ephemeral"
          :default-node-component="nodeComp"
          allow-drop
          :minimap="false"
          @update:rows="onRows"
          @node-drop="onNodeDrop"
          @node-dbl-click="onDblClick"
        />
      </ClientOnly>
      <p
        v-if="!flowNodes.length"
        class="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted"
      >
        Drag a component onto the canvas →
      </p>
    </div>
  </div>
</template>
