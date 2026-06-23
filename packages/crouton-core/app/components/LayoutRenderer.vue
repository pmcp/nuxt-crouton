<script setup lang="ts">
/**
 * CroutonLayoutRenderer — renders a layout *data tree* into resizable, nestable
 * panes using reka-ui's Splitter primitives (Sprint 0 spike, #713).
 *
 * - `split` node  → a SplitterGroup with one SplitterPanel per child (recursing
 *   into CroutonLayoutRenderer), interleaved with resize handles. Nesting = a
 *   SplitterGroup inside a SplitterPanel.
 * - `leaf` node   → one block, resolved id → component through the allowlisted
 *   `blocks` map. An unknown id renders a safe fallback — NEVER an arbitrary
 *   component (the "layout tree is untrusted input" guard).
 *
 * Splitter primitives are SSR-safe (no <ClientOnly> needed). Throwaway spike;
 * the production renderer lands in Sprint 3 (#706).
 */
import type { Component } from 'vue'
import { computed } from 'vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { LayoutNode, LayoutSplit } from '../types/layout'

const props = defineProps<{
  node: LayoutNode
  blocks: Record<string, Component>
}>()

const emit = defineEmits<{
  /** Bubbled up on resize so the owner can persist sizes into its tree. */
  layoutChange: [node: LayoutSplit, sizes: number[]]
}>()

// Allowlisted resolution: only ids present in the registry map resolve.
const resolved = computed<Component | null>(() => {
  if (props.node.type !== 'leaf') return null
  return props.blocks[props.node.blockId] ?? null
})

function onLayout(sizes: number[]) {
  if (props.node.type === 'split') emit('layoutChange', props.node, sizes)
}
</script>

<template>
  <!-- Leaf -->
  <template v-if="node.type === 'leaf'">
    <component
      :is="resolved"
      v-if="resolved"
      v-bind="node.config"
      class="h-full w-full overflow-auto"
    />
    <div
      v-else
      class="h-full w-full flex items-center justify-center p-4 text-sm text-error text-center"
    >
      Unknown block:&nbsp;<code>{{ node.blockId }}</code>
    </div>
  </template>

  <!-- Split -->
  <SplitterGroup
    v-else
    :direction="node.direction"
    class="h-full w-full"
    @layout="onLayout"
  >
    <template
      v-for="(child, i) in node.children"
      :key="i"
    >
      <SplitterResizeHandle
        v-if="i > 0"
        class="bg-border hover:bg-primary transition-colors data-[orientation=horizontal]:w-px data-[orientation=vertical]:h-px"
      />
      <SplitterPanel
        :default-size="child.defaultSize ?? (100 / node.children.length)"
        :min-size="child.minSize ?? 0"
        class="overflow-hidden"
      >
        <CroutonLayoutRenderer
          :node="child"
          :blocks="blocks"
          @layout-change="(n: LayoutSplit, s: number[]) => emit('layoutChange', n, s)"
        />
      </SplitterPanel>
    </template>
  </SplitterGroup>
</template>
