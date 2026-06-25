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
import { isInPlaceCollapse } from '@fyit/crouton-core/app/types/layout'
import { normalizeCollapseStyle } from '../utils/layout-responsive'
import { useCroutonLayoutResponsive, LAYOUT_VARIANTS_KEY, LAYOUT_COLLAPSE_KEY } from '../composables/useCroutonLayoutResponsive'

const props = defineProps<{
  tree: LayoutTree
  /** Simulate a container width (px) instead of measuring — for the device frame. */
  width?: number
}>()

const emit = defineEmits<{
  /** A collapsed pane (gutter tab or in-place handle) was clicked — host may expand it. */
  expand: [blockId: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
const { width: measured } = useElementSize(hostRef)
const effectiveWidth = computed(() => (props.width !== undefined ? props.width : measured.value))

const { resolved, visibleRoot, collapsedPanes, variants, activeBreakpoint } = useCroutonLayoutResponsive(
  toRef(props, 'tree'),
  effectiveWidth,
)

provide(LAYOUT_VARIANTS_KEY, variants)

// WS6 #875: the active breakpoint's collapse motion (normalized — absent ⇒ gutter-tabs).
// `gutter-tabs` keeps the right-edge rail; the in-place styles keep collapsed panes in the
// tree (rendered as handles) and reclaim their space via the splitter.
const collapseStyle = computed(() => normalizeCollapseStyle(resolved.value.collapseStyle))
const inPlace = computed(() => isInPlaceCollapse(collapseStyle.value))

// Provide the in-place collapse context to the recursive renderer — only when an
// in-place style is active, so the gutter-tabs path is untouched.
provide(LAYOUT_COLLAPSE_KEY, computed(() =>
  inPlace.value
    ? { collapsedSet: new Set(resolved.value.collapsed), style: collapseStyle.value, expand: (id: string) => emit('expand', id) }
    : null,
))

defineExpose({ activeBreakpoint, collapseStyle })
</script>

<template>
  <div
    ref="hostRef"
    class="relative flex h-full w-full"
  >
    <!-- In-place collapse (WS6 #875): render the FULL resolved tree — collapsed panes
         stay in their slots as motion handles (provided via LAYOUT_COLLAPSE_KEY) and the
         splitter hands their space back to siblings. No gutter rail. -->
    <template v-if="inPlace">
      <CroutonLayoutRenderer
        :node="resolved.root"
        class="min-w-0 flex-1"
      />
    </template>

    <!-- gutter-tabs (default): collapsed panes leave the splitter into a right-edge rail. -->
    <template v-else>
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

      <!-- Gutter rail: each collapsed pane as a tab. -->
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
    </template>
  </div>
</template>
