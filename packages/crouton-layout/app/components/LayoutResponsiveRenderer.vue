<script setup lang="ts">
/**
 * CroutonLayoutResponsiveRenderer — renders a `LayoutTree` *with its authored
 * breakpoints applied* (WS5, #874). The explicit layer on top of the plain
 * `CroutonLayoutRenderer`:
 *
 *  - resolves the tree at a container width (measured from this element, or a
 *    simulated `width` for the breakpoint-authoring frame),
 *  - renders the resolved arrangement minus collapsed panes,
 *  - shows the collapsed panes as a gutter rail of tabs (→ "collapse a pane to a
 *    gutter tab"), and
 *  - provides the active breakpoint's per-block widget variants to the renderer.
 *
 * The *intrinsic* layer (each pane reflowing to its own width via `@container`)
 * lives in `CroutonLayoutRenderer`'s CSS and needs nothing here — the two
 * compose: this picks the arrangement; the renderer reflows within each pane.
 */
import { computed, provide, ref, toRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'
import { useCroutonLayoutResponsive, LAYOUT_VARIANTS_KEY } from '../composables/useCroutonLayoutResponsive'

const props = defineProps<{
  tree: LayoutTree
  /** Simulate a container width (px) instead of measuring — for the device frame. */
  width?: number
}>()

const emit = defineEmits<{
  /** A collapsed gutter tab was clicked (the host may expand it). */
  expand: [blockId: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
const { width: measured } = useElementSize(hostRef)
const effectiveWidth = computed(() => (props.width !== undefined ? props.width : measured.value))

const { visibleRoot, collapsedPanes, variants, activeBreakpoint } = useCroutonLayoutResponsive(
  toRef(props, 'tree'),
  effectiveWidth,
)

provide(LAYOUT_VARIANTS_KEY, variants)

defineExpose({ activeBreakpoint })
</script>

<template>
  <div
    ref="hostRef"
    class="relative flex h-full w-full"
  >
    <div class="min-w-0 flex-1">
      <CroutonLayoutRenderer
        v-if="visibleRoot"
        :node="visibleRoot"
      />
      <div
        v-else
        class="grid h-full w-full place-items-center p-6 text-center text-sm text-muted"
      >
        Every pane is collapsed at this width — expand one from the gutter.
      </div>
    </div>

    <!-- Gutter rail: each collapsed pane as a tab (WS5 #874; collapse-style is WS6). -->
    <div
      v-if="collapsedPanes.length"
      class="flex w-9 shrink-0 flex-col items-stretch gap-1 border-l border-default bg-elevated/60 p-1"
    >
      <button
        v-for="pane in collapsedPanes"
        :key="pane.blockId"
        type="button"
        :title="`Expand ${pane.label ? pane.label + ' · ' : ''}${pane.blockId}`"
        class="group flex flex-1 flex-col items-center justify-center gap-1 rounded-md border border-default bg-default py-2 text-muted transition-colors hover:border-primary hover:text-primary"
        @click="emit('expand', pane.blockId)"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="size-3.5"
        />
        <span class="[writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-wide">{{ pane.label || pane.blockId }}</span>
      </button>
    </div>
  </div>
</template>
