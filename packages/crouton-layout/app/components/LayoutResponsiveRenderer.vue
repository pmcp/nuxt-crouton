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
import { computed, provide, ref, toRef, watch } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { LayoutNode, LayoutSplit, LayoutTree } from '@fyit/crouton-core/app/types/layout'
import { isInPlaceCollapse } from '@fyit/crouton-core/app/types/layout'
import { normalizeCollapseStyle } from '../utils/layout-responsive'
import { findNodePath, type NodePath } from '../utils/layout-edit'
import { useCroutonLayoutResponsive, LAYOUT_VARIANTS_KEY, LAYOUT_COLLAPSE_KEY } from '../composables/useCroutonLayoutResponsive'

const props = defineProps<{
  tree: LayoutTree
  /** Simulate a container width (px) instead of measuring — for the device frame. */
  width?: number
}>()

const emit = defineEmits<{
  /** A collapsed pane (gutter tab or in-place handle) was clicked — host may expand it. */
  expand: [blockId: string]
  /**
   * A splitter was dragged (WS5 #874 follow-up — "resize → breakpoint"). We translate
   * the resized split *node* to its `NodePath` within the resolved root and bubble that
   * up, so the author (which resolves the same tree at the same width) can apply the new
   * sizes onto a structurally-identical root and snapshot them onto a breakpoint here.
   */
  layoutChange: [path: NodePath, sizes: number[]]
}>()

function onInnerLayout(node: LayoutSplit, sizes: number[]) {
  const path = findNodePath(resolved.value.root, node)
  if (path) emit('layoutChange', path, sizes)
}

const hostRef = ref<HTMLElement | null>(null)
const { width: measured } = useElementSize(hostRef)
const effectiveWidth = computed(() => (props.width !== undefined ? props.width : measured.value))

const { resolved, visibleRoot, collapsedPanes, variants, activeBreakpoint } = useCroutonLayoutResponsive(
  toRef(props, 'tree'),
  effectiveWidth,
)

provide(LAYOUT_VARIANTS_KEY, variants)

const collapseStyle = computed(() => normalizeCollapseStyle(resolved.value.collapseStyle))
const inPlace = computed(() => isInPlaceCollapse(collapseStyle.value))

// Expand = OVERLAY DRAWER (#873/#875 follow-up). Clicking a collapsed pane (gutter tab or
// in-place handle) peeks it as an overlay sliding over the content — the collapsed zone
// stays put, and a clear close affordance slides it back. Makes "what happened on click"
// obvious, instead of the old silent reflow.
const openOverlay = ref<string | null>(null)

// The drawer slides out from — and back to — the SIDE the collapsed pane lives on (a
// left pane → from the left), so the motion reads as "this pane opened up". We LATCH the
// side when the drawer opens (`overlaySide`) and keep it through the close: deriving it
// from `openOverlay` would flip to the default the moment it's nulled, so a left drawer
// would exit right. Determined by the block's position in the top horizontal split;
// vertical splits (or not found) fall back to the right.
function subtreeHasBlock(node: LayoutNode, blockId: string): boolean {
  if (node.type === 'leaf') return node.blockId === blockId
  if (node.type === 'nested') return subtreeHasBlock(node.layout.root, blockId)
  if (node.type === 'split') return node.children.some(c => subtreeHasBlock(c, blockId))
  return false
}
function sideOfBlock(blockId: string): 'left' | 'right' {
  const root = resolved.value.root
  if (!root || root.type !== 'split' || root.direction !== 'horizontal') return 'right'
  const idx = root.children.findIndex(c => subtreeHasBlock(c, blockId))
  if (idx < 0) return 'right'
  return idx < root.children.length / 2 ? 'left' : 'right'
}
const overlaySide = ref<'left' | 'right'>('right')
function peek(blockId: string) { overlaySide.value = sideOfBlock(blockId); openOverlay.value = blockId; emit('expand', blockId) }
const overlayPane = computed(() => collapsedPanes.value.find(p => p.blockId === openOverlay.value) ?? null)
const overlayNode = computed<LayoutNode | null>(() => (openOverlay.value ? { type: 'leaf', blockId: openOverlay.value } : null))

// Render the peeked block DIRECTLY (not via CroutonLayoutRenderer) so it shows its real
// content: the in-place collapse context provided above would otherwise leak in and draw
// the collapsed *handle* again inside the drawer.
const { resolveComponentName: resolveOverlayComponent, sanitizeConfig: sanitizeOverlayConfig } = useCroutonLayoutBlocks()
const overlayComponent = computed(() => (openOverlay.value ? resolveOverlayComponent(openOverlay.value) : null))
const overlayConfig = computed<Record<string, unknown>>(() => (openOverlay.value ? sanitizeOverlayConfig(openOverlay.value, undefined) : {}))
// If the width changes so the pane is no longer collapsed, close the overlay.
watch(collapsedPanes, panes => { if (openOverlay.value && !panes.some(p => p.blockId === openOverlay.value)) openOverlay.value = null })

// Provide the in-place collapse context to the recursive renderer — only when an
// in-place style is active, so the gutter-tabs path is untouched. `expand` opens the drawer.
provide(LAYOUT_COLLAPSE_KEY, computed(() =>
  inPlace.value
    ? { collapsedSet: new Set(resolved.value.collapsed), style: collapseStyle.value, expand: peek }
    : null,
))

defineExpose({ activeBreakpoint, collapseStyle, openOverlay })
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
        @layout-change="onInnerLayout"
      />
    </template>

    <!-- gutter-tabs (default): collapsed panes leave the splitter into a right-edge rail. -->
    <template v-else>
      <div class="min-w-0 flex-1">
        <CroutonLayoutRenderer
          v-if="visibleRoot"
          :node="visibleRoot"
          @layout-change="onInnerLayout"
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
        @click="peek(pane.blockId)"
      >
        <UIcon
          name="i-lucide-chevron-left"
          class="size-3.5"
        />
        <span class="[writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-wide">{{ pane.label || pane.blockId }}</span>
      </button>
      </div>
    </template>

    <!-- Expand drawer: the peeked pane slides over the content; scrim/✕ slides it back. -->
    <Transition name="mq-scrim">
      <div
        v-if="openOverlay"
        class="absolute inset-0 z-40 bg-black/40"
        @click="openOverlay = null"
      />
    </Transition>
    <Transition :name="overlaySide === 'left' ? 'mq-drawer-l' : 'mq-drawer-r'">
      <div
        v-if="openOverlay && overlayNode"
        class="absolute inset-y-0 z-50 flex w-[min(440px,88%)] flex-col bg-default shadow-2xl"
        :class="overlaySide === 'left' ? 'left-0 border-r border-default' : 'right-0 border-l border-default'"
      >
        <div class="flex items-center gap-2 border-b border-default px-3 py-2">
          <UIcon
            name="i-lucide-panel-right-open"
            class="size-4 text-muted"
          />
          <span class="text-sm font-medium">{{ overlayPane?.label || openOverlay }}</span>
          <span class="rounded-full border border-default px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">overlay</span>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            class="ml-auto"
            aria-label="Close"
            @click="openOverlay = null"
          />
        </div>
        <div class="min-h-0 flex-1 overflow-auto">
          <component
            :is="overlayComponent"
            v-if="overlayComponent"
            v-bind="overlayConfig"
            class="h-full w-full overflow-auto"
          />
          <div
            v-else
            class="grid h-full w-full place-items-center p-6 text-center text-sm text-error"
          >
            Unknown block:&nbsp;<code>{{ openOverlay }}</code>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mq-scrim-enter-active, .mq-scrim-leave-active { transition: opacity .2s ease }
.mq-scrim-enter-from, .mq-scrim-leave-to { opacity: 0 }
.mq-drawer-r-enter-active, .mq-drawer-r-leave-active,
.mq-drawer-l-enter-active, .mq-drawer-l-leave-active { transition: transform .28s cubic-bezier(.32,.72,0,1) }
.mq-drawer-r-enter-from, .mq-drawer-r-leave-to { transform: translateX(100%) }
.mq-drawer-l-enter-from, .mq-drawer-l-leave-to { transform: translateX(-100%) }
@media (prefers-reduced-motion: reduce) {
  .mq-scrim-enter-active, .mq-scrim-leave-active,
  .mq-drawer-r-enter-active, .mq-drawer-r-leave-active,
  .mq-drawer-l-enter-active, .mq-drawer-l-leave-active { transition: none }
}
</style>
