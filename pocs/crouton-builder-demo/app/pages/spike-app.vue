<script setup lang="ts">
/**
 * Spike (#903) — "everything in Vue Flow": build an app by dragging a collection's
 * blocks from a DRAWER onto a Vue Flow canvas, then COMPILE the placement into a real
 * layout (fork A). Throwaway side-surface to feel whether the direction holds.
 *
 *   drawer (Artists' blocks) ──drag──▶ CroutonFlow (ephemeral) ──compile──▶ LayoutTree
 *
 * Reuses what already exists: CroutonFlow's drag-drop (`@node-drop`) and the WS8
 * pieces↔tree bridge (`piecesToTree`). No backend — the Artists blocks are demo blocks.
 */
import { markRaw } from 'vue'
import type { LayoutNode, LayoutTree } from '@fyit/crouton-core/app/types/layout'
import SpikeBlockNode from '~/components/SpikeBlockNode.vue'

useHead({ title: 'Spike · app on Vue Flow' })
const BUILD = 'spike-a · #903 · drag blocks from the drawer → flow → Compile to a layout'

const blockNode = markRaw(SpikeBlockNode)

// The drawer = the blocks a collection ("Artists") offers. In the real thing this list
// is derived from the collection; here it's the registered demo blocks.
const drawer = [
  { blockId: 'artists-list', label: 'Artists · List', icon: 'i-lucide-list' },
  { blockId: 'artists-form', label: 'Artists · New', icon: 'i-lucide-square-pen' },
  { blockId: 'artists-stats', label: 'Artists · Stats', icon: 'i-lucide-bar-chart-3' },
]

// Pre-built Vue Flow nodes (CroutonFlow ephemeral mode renders these directly).
interface FlowNode { id: string, type: string, position: { x: number, y: number }, data: { blockId: string, label?: string } }
const nodes = ref<FlowNode[]>([])
let seq = 0

/** HTML5 drag source: stamp the crouton-item payload CroutonFlow's drop handler reads. */
function onDragStart(e: DragEvent, item: { blockId: string, label: string }) {
  e.dataTransfer?.setData('application/json', JSON.stringify({
    type: 'crouton-item',
    collection: 'artists',
    item: { id: `${item.blockId}-${++seq}`, ...item },
  }))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

/** CroutonFlow emits this on drop with the flow-space position — add the node. */
function onNodeDrop(item: Record<string, unknown>, position: { x: number, y: number }) {
  nodes.value = [...nodes.value, {
    id: String(item.id),
    type: 'default',
    position,
    data: { blockId: String(item.blockId), label: String(item.label ?? item.blockId) },
  }]
}

// Fork A — compile the placement into a layout. Same rule as the WS8 bridge's
// piecesToTree, inlined (the package util isn't exposed as a POC import): 1 node → its
// leaf is the root; many → a split whose axis is inferred from how they're laid out
// (wider spread in x ⇒ horizontal), ordered along that axis. The productionised path
// would call the real `piecesToTree`.
const compiled = ref<LayoutTree | null>(null)
function compile() {
  const ns = nodes.value
  if (!ns.length) { compiled.value = null; return }
  const leaf = (n: FlowNode): LayoutNode => ({ type: 'leaf', blockId: n.data.blockId })
  if (ns.length === 1) {
    compiled.value = { renderer: 'panes', root: leaf(ns[0]!) }
    return
  }
  const spread = (a: number[]) => Math.max(...a) - Math.min(...a)
  const horizontal = spread(ns.map(n => n.position.x)) >= spread(ns.map(n => n.position.y))
  const ordered = [...ns].sort((a, b) => (horizontal ? a.position.x - b.position.x : a.position.y - b.position.y))
  compiled.value = {
    renderer: 'panes',
    root: {
      type: 'split',
      direction: horizontal ? 'horizontal' : 'vertical',
      children: ordered.map(n => ({ ...leaf(n), defaultSize: Math.round((100 / ordered.length) * 10) / 10 })),
    },
  }
}
function reset() {
  nodes.value = []
  compiled.value = null
}
</script>

<template>
  <div class="flex h-screen flex-col bg-default text-default">
    <header class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-default px-5 py-3">
      <h1 class="text-base font-semibold">Spike · build an app on Vue Flow</h1>
      <p class="text-xs text-muted">Drag a block from the drawer onto the canvas → Compile. #903</p>
      <span class="ml-auto rounded-full border border-default bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted">{{ BUILD }}</span>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- Drawer — the collection's blocks, draggable onto the canvas -->
      <aside class="w-56 shrink-0 overflow-y-auto border-r border-default bg-elevated/40 p-3">
        <p class="mb-2 text-xs uppercase tracking-widest text-muted">Artists · blocks</p>
        <div class="flex flex-col gap-2">
          <div
            v-for="b in drawer"
            :key="b.blockId"
            draggable="true"
            class="flex cursor-grab items-center gap-2 rounded-lg border border-default bg-default px-3 py-2 text-sm transition-colors hover:border-primary active:cursor-grabbing"
            @dragstart="onDragStart($event, b)"
          >
            <UIcon :name="b.icon" class="size-4 text-primary" />
            <span>{{ b.label }}</span>
            <UIcon name="i-lucide-grip-vertical" class="ml-auto size-3.5 text-muted" />
          </div>
        </div>
        <div class="mt-4 flex flex-col gap-2">
          <UButton size="xs" icon="i-lucide-wand-2" :disabled="!nodes.length" block @click="compile">Compile to layout</UButton>
          <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-rotate-ccw" block @click="reset">Reset</UButton>
        </div>
      </aside>

      <!-- The Vue Flow canvas -->
      <div class="relative min-w-0 flex-1">
        <ClientOnly>
          <CroutonFlow
            v-model:rows="nodes"
            collection="artists"
            data-mode="ephemeral"
            :default-node-component="blockNode"
            allow-drop
            :minimap="false"
            @node-drop="onNodeDrop"
          />
        </ClientOnly>
        <p
          v-if="!nodes.length"
          class="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted"
        >
          Drag a block from the drawer onto the canvas →
        </p>
      </div>

      <!-- Compiled layout — the result of fork A -->
      <aside
        v-if="compiled"
        class="w-96 shrink-0 overflow-hidden border-l border-default p-3"
      >
        <p class="mb-2 text-xs uppercase tracking-widest text-muted">Compiled layout</p>
        <div class="h-[calc(100%-2rem)] overflow-hidden rounded-xl border border-default">
          <CroutonLayoutRenderer :node="compiled.root" />
        </div>
      </aside>
    </div>
  </div>
</template>
