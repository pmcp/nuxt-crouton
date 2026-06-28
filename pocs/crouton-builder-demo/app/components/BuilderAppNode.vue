<script setup lang="ts">
/**
 * BuilderAppNode (#939) — a Vue Flow node that renders a layout NODE on the App-level
 * canvas. Unlike the spike's leaf-only card, it renders ANY `LayoutNode` (leaf / split /
 * nested) through the normal read-only renderer, so a page's real components show up
 * legibly — and a `nested` app reads as one card you can double-click to zoom into.
 *
 * The body is `pointer-events-none` so it's a clean thumbnail: dragging the node never
 * fights an inner splitter, and clicks go to Vue Flow (drag / double-click-to-zoom).
 */
import { computed } from 'vue'
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'

const props = defineProps<{
  data: { node: LayoutNode, label?: string }
  selected?: boolean
}>()

const node = computed<LayoutNode>(() => props.data.node)
const isApp = computed(() => node.value?.type === 'nested')
const title = computed(() =>
  props.data.label
  || (node.value?.type === 'leaf'
    ? node.value.blockId
    : node.value?.type === 'nested'
      ? (node.value.label || 'App')
      : 'Group'),
)
const icon = computed(() => (isApp.value ? 'i-lucide-layers' : 'i-lucide-box'))
</script>

<template>
  <div
    class="builder-app-node w-[420px] overflow-hidden rounded-xl border bg-default shadow-sm transition-shadow"
    :class="selected ? 'border-primary shadow-lg' : 'border-default'"
  >
    <div class="flex items-center gap-2 border-b border-default bg-elevated/60 px-3 py-1.5">
      <UIcon
        :name="icon"
        class="size-3.5 text-primary"
      />
      <span class="truncate text-xs font-medium">{{ title }}</span>
      <span
        v-if="isApp"
        class="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
      >
        <UIcon
          name="i-lucide-maximize-2"
          class="size-2.5"
        />
        open
      </span>
    </div>
    <div class="pointer-events-none h-52 overflow-hidden">
      <CroutonLayoutRenderer :node="node" />
    </div>
  </div>
</template>
