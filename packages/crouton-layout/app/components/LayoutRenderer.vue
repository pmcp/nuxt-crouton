<script setup lang="ts">
/**
 * CroutonLayoutRenderer — renders a layout *data tree* into resizable, nestable
 * panes using reka-ui's Splitter primitives (Sprint 0 #713 → Sprint 1 #704 →
 * runtime min-width enforcement Sprint 3 #706).
 *
 * - `split` node → a SplitterGroup with one SplitterPanel per child (recursing),
 *   interleaved with resize handles. Nesting = a group inside a panel.
 * - `leaf` node  → one block, resolved id → component NAME through the
 *   ALLOWLISTED `croutonLayoutBlocks` registry (#704). An unknown id renders a
 *   safe fallback — NEVER an arbitrary component. Per-block config is sanitized
 *   against the block's declared schema before it reaches props.
 *
 * Min-width enforcement (#710): a horizontal pane refuses to shrink a block
 * below its declared `minWidth` — we measure the live group width and convert
 * each block's px floor to the SplitterPanel's `min-size` (%) via
 * `panelMinSizePct`. Splitter primitives are SSR-safe (no <ClientOnly> needed);
 * the floor falls back to the authored `minSize` until the group has measured.
 */
import { computed, inject, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import type { LayoutNode, LayoutSplit } from '@fyit/crouton-core/app/types/layout'
import { minWidthResolver, panelMinSizePct } from '../utils/layout-viability'
import { LAYOUT_VARIANTS_KEY } from '../composables/useCroutonLayoutResponsive'

const props = defineProps<{ node: LayoutNode }>()

// Per-block widget variant overrides for the authored breakpoint in view (WS5
// #874), provided by CroutonLayoutResponsiveRenderer. Absent (plain renderer) →
// no overrides. A leaf's variant is merged into its config so the block can read
// `variant` like any other prop.
const variants = inject(LAYOUT_VARIANTS_KEY, ref({} as Record<string, string>))

const emit = defineEmits<{
  /** Bubbled up on resize so the owner can persist sizes into its tree. */
  layoutChange: [node: LayoutSplit, sizes: number[]]
}>()

const { blocks, resolveComponentName, sanitizeConfig } = useCroutonLayoutBlocks()

// Allowlisted: only ids registered in croutonLayoutBlocks resolve to a component.
const componentName = computed<string | null>(() =>
  props.node.type === 'leaf' ? resolveComponentName(props.node.blockId) : null,
)
const safeConfig = computed<Record<string, unknown>>(() => {
  if (props.node.type !== 'leaf') return {}
  const config = sanitizeConfig(props.node.blockId, props.node.config)
  const variant = variants.value[props.node.blockId]
  // The authored breakpoint's widget variant wins over the stored config.
  return variant ? { ...config, variant } : config
})

// Live width of THIS split's group → converts each child's px min-width floor
// to a percentage min-size for its panel (horizontal splits only).
const groupRef = ref<HTMLElement | null>(null)
const { width: groupWidth } = useElementSize(groupRef)
const minWidthFor = computed(() => minWidthResolver(blocks.value))

function panelMin(child: LayoutNode): number {
  if (props.node.type !== 'split') return 0
  return panelMinSizePct(props.node.direction, child, groupWidth.value, minWidthFor.value)
}

function onLayout(sizes: number[]) {
  if (props.node.type === 'split') emit('layoutChange', props.node, sizes)
}
</script>

<template>
  <!-- Leaf — its wrapper is a CSS container (intrinsic responsiveness, WS5 #874):
       the block reflows to ITS OWN pane width via `@container`, independent of the
       viewport. Every pane is its own container, so this composes recursively. -->
  <div
    v-if="node.type === 'leaf'"
    class="croutonpane h-full w-full"
  >
    <component
      :is="componentName"
      v-if="componentName"
      v-bind="safeConfig"
      class="h-full w-full overflow-auto"
    />
    <div
      v-else
      class="h-full w-full flex items-center justify-center p-4 text-sm text-error text-center"
    >
      Unknown block:&nbsp;<code>{{ node.blockId }}</code>
    </div>
  </div>

  <!-- Nested sub-layout (an app that is itself a layout, WS2 #871) → recurse.
       Also a container so the sub-layout reflows to its own pane (intrinsic, WS5).
       Read-only here; persisting a nested resize is part of nested authoring (WS4). -->
  <div
    v-else-if="node.type === 'nested'"
    class="croutonpane h-full w-full"
  >
    <CroutonLayoutRenderer :node="node.layout.root" />
  </div>

  <!-- Split -->
  <SplitterGroup
    v-else-if="node.type === 'split'"
    ref="groupRef"
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
        :min-size="panelMin(child)"
        class="overflow-hidden"
      >
        <CroutonLayoutRenderer
          :node="child"
          @layout-change="(n: LayoutSplit, s: number[]) => emit('layoutChange', n, s)"
        />
      </SplitterPanel>
    </template>
  </SplitterGroup>
</template>

<style scoped>
/* Intrinsic responsiveness (WS5 #874): each pane is a query container, so a
   block sizes to its own pane width (`@container (min-width: …)`) rather than the
   viewport. `inline-size` constrains only the inline axis — height still flows,
   so `h-full` panes are unaffected. Recursive: every nested pane re-establishes
   its own container, so reflow holds at any depth. */
.croutonpane {
  container-type: inline-size;
  container-name: pane;
}
</style>
