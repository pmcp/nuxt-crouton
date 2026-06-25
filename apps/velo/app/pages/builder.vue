<script setup lang="ts">
/**
 * Crouton Builder — live preview (epic #868). A public demo page that mounts the REAL
 * builder surfaces with backend-free `stats` blocks, so the WS4 compose gestures, WS5
 * responsiveness, and WS6 collapse motions can be driven by hand on a deployed URL.
 * Throwaway review aid — not part of velo's product.
 */
import type { LayoutNode, LayoutTree, LayoutCollapseStyle } from '@fyit/crouton-core/app/types/layout'

// Structural match for crouton-layout's ComposePiece (its composables subpath isn't
// exposed for type imports; the canvas accepts any structurally-compatible piece).
interface ComposePiece {
  id: string
  node: LayoutNode
  x: number
  y: number
  width: number
  height: number
  label?: string
}

definePageMeta({ layout: false }) // standalone — no app chrome / no auth middleware

const tab = ref<'compose' | 'responsive' | 'author'>('compose')

// --- WS4: free pieces on the canvas (all `stats` — render with no backend) ---
const pieces = ref<ComposePiece[]>([
  { id: 'sales', node: { type: 'leaf', blockId: 'stats' }, x: 40, y: 40, width: 240, height: 150, label: 'Sales' },
  { id: 'traffic', node: { type: 'leaf', blockId: 'stats' }, x: 360, y: 90, width: 240, height: 150, label: 'Traffic' },
  { id: 'revenue', node: { type: 'leaf', blockId: 'stats' }, x: 200, y: 270, width: 240, height: 150, label: 'Revenue' },
])

// --- WS5/WS6: a tree with an authored breakpoint that collapses a pane below 640px ---
const collapseStyle = ref<LayoutCollapseStyle>('iris-portal')
const simWidth = ref(880)
const respTree = computed<LayoutTree>(() => ({
  renderer: 'panes',
  root: {
    type: 'split', direction: 'horizontal',
    children: [
      { type: 'leaf', blockId: 'demo-a', defaultSize: 38 },
      { type: 'leaf', blockId: 'demo-b', defaultSize: 62 },
    ],
  },
  breakpoints: [
    // Below 640px the LEFT pane (demo-a) collapses with the chosen motion and demo-b
    // reflows to fill; ≥640 both show.
    { minWidth: 0, label: 'Phone', collapsed: ['demo-a'], collapseStyle: collapseStyle.value },
    { minWidth: 640, label: 'Wide', collapsed: [] },
  ],
}))

const authorTree = ref<LayoutTree>({
  renderer: 'panes',
  root: {
    type: 'split', direction: 'horizontal',
    children: [
      { type: 'leaf', blockId: 'demo-a', defaultSize: 40 },
      { type: 'leaf', blockId: 'demo-b', defaultSize: 60 },
    ],
  },
})

const styles: LayoutCollapseStyle[] = ['gutter-tabs', 'spring-drawer', 'crt-power-down', 'iris-portal']

function resetPieces() {
  pieces.value = [
    { id: 'sales', node: { type: 'leaf', blockId: 'stats' }, x: 40, y: 40, width: 240, height: 150, label: 'Sales' },
    { id: 'traffic', node: { type: 'leaf', blockId: 'stats' }, x: 360, y: 90, width: 240, height: 150, label: 'Traffic' },
    { id: 'revenue', node: { type: 'leaf', blockId: 'stats' }, x: 200, y: 270, width: 240, height: 150, label: 'Revenue' },
  ]
}
</script>

<template>
  <div class="min-h-screen bg-default p-6 text-default">
    <header class="mb-5">
      <h1 class="text-xl font-semibold">Crouton Builder — live preview</h1>
      <p class="mt-1 text-sm text-muted">Drag the real components. Throwaway review page for epic #868 (WS4 compose · WS5 responsiveness · WS6 collapse).</p>
    </header>

    <div class="mb-5 flex gap-2">
      <UButton
        v-for="t in (['compose', 'responsive', 'author'] as const)"
        :key="t"
        :color="tab === t ? 'primary' : 'neutral'"
        :variant="tab === t ? 'solid' : 'soft'"
        size="sm"
        @click="tab = t"
      >
        {{ t === 'compose' ? 'WS4 · Compose' : t === 'responsive' ? 'WS5/6 · Responsive + Collapse' : 'WS5 · Breakpoint author' }}
      </UButton>
    </div>

    <!-- WS4 -->
    <section v-if="tab === 'compose'">
      <div class="mb-3 flex items-center gap-3 text-sm text-muted">
        <span>Drag a card next to another → they snap into a bound layout. Hold one over another → it drops inside (nested).</span>
        <UButton
          size="xs"
          variant="soft"
          icon="i-lucide-rotate-ccw"
          @click="resetPieces"
        >Reset</UButton>
      </div>
      <ClientOnly>
        <div class="h-[520px] w-full">
          <CroutonLayoutComposeCanvas v-model="pieces" />
        </div>
      </ClientOnly>
    </section>

    <!-- WS5 + WS6 -->
    <section v-else-if="tab === 'responsive'">
      <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2">
          <span class="text-muted">Container width</span>
          <input
            v-model.number="simWidth"
            type="range"
            min="320"
            max="1100"
            class="w-56"
          >
          <span class="tabular-nums">{{ simWidth }}px</span>
        </label>
        <div class="flex items-center gap-2">
          <span class="text-muted">Collapse style</span>
          <UButton
            v-for="s in styles"
            :key="s"
            size="xs"
            :color="collapseStyle === s ? 'primary' : 'neutral'"
            :variant="collapseStyle === s ? 'solid' : 'soft'"
            @click="collapseStyle = s"
          >{{ s }}</UButton>
        </div>
      </div>
      <p class="mb-3 text-sm text-muted">Drag the width below 640px → the left pane collapses with the chosen motion and the other reflows in.</p>
      <ClientOnly>
        <div
          class="mx-auto h-[460px] overflow-hidden rounded-lg border border-default transition-all"
          :style="{ width: `${simWidth}px`, maxWidth: '100%' }"
        >
          <CroutonLayoutResponsiveRenderer
            :tree="respTree"
            :width="simWidth"
          />
        </div>
      </ClientOnly>
    </section>

    <!-- WS5 L3 author -->
    <section v-else>
      <p class="mb-3 text-sm text-muted">The Breakpoints zoom level (L3): author responsiveness by demonstration — pick a device / drag the ruler, then collapse panes or switch widget variants at that width.</p>
      <ClientOnly>
        <div class="h-[560px] w-full overflow-hidden rounded-lg border border-default">
          <CroutonLayoutBreakpointAuthor v-model="authorTree" />
        </div>
      </ClientOnly>
    </section>
  </div>
</template>
