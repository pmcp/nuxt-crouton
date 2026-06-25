<script setup lang="ts">
/**
 * Crouton Builder — live POC (epic #868). Mounts the REAL builder surfaces with
 * backend-free `stats` blocks so the WS4 compose gestures, WS5 responsiveness, and
 * WS6 collapse motions can be driven by hand on a deployed URL.
 */
import type { LayoutNode, LayoutTree, LayoutCollapseStyle } from '@fyit/crouton-core/app/types/layout'

useHead({ title: 'Crouton Builder — live POC' })

// Bump on every deploy so you can confirm (esp. on mobile, where the browser caches
// hard) that you're looking at the latest build, not a stale one.
const BUILD = 'b10 · 25 Jun · overlay-drawer expand · nested unpack · breakpoint dots + rounded width'

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

const tab = ref<'compose' | 'responsive' | 'author'>('compose')

// Seeded in a vertical stack at a small fixed x so they fit even a narrow mobile
// canvas without overlapping; the canvas clamps anything that would fall off-edge.
const seed = (): ComposePiece[] => [
  { id: 'sales', node: { type: 'leaf', blockId: 'demo-a' }, x: 16, y: 16, width: 240, height: 140, label: 'Sales' },
  { id: 'traffic', node: { type: 'leaf', blockId: 'demo-b' }, x: 16, y: 168, width: 240, height: 140, label: 'Traffic' },
  { id: 'revenue', node: { type: 'leaf', blockId: 'demo-a' }, x: 16, y: 320, width: 240, height: 140, label: 'Revenue' },
]
const pieces = ref<ComposePiece[]>(seed())

const collapseStyle = ref<LayoutCollapseStyle>('iris-portal')
const simWidth = ref(880)
// Clicking a collapsed pane is now handled inside the renderer (it slides out as an
// overlay drawer), so the page just declares the breakpoints.
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
</script>

<template>
  <div class="min-h-screen bg-default p-6 text-default">
    <header class="mb-5">
      <h1 class="text-xl font-semibold">Maquette — live POC</h1>
      <p class="mt-1 text-sm text-muted">Drag the real components. Epic #868 — WS4 compose · WS5 responsiveness · WS6 collapse.</p>
      <span class="mt-2 inline-block rounded-full border border-default bg-elevated px-2 py-0.5 font-mono text-[10px] text-muted">{{ BUILD }}</span>
    </header>

    <div class="mb-5 flex flex-wrap gap-2">
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

    <section v-if="tab === 'compose'">
      <div class="mb-3 flex items-center gap-3 text-sm text-muted">
        <span>Drag a card next to another → they snap into a bound layout. Hold one over another → it drops inside (nested).</span>
        <UButton
          size="xs"
          variant="soft"
          icon="i-lucide-rotate-ccw"
          @click="pieces = seed()"
        >Reset</UButton>
      </div>
      <ClientOnly>
        <div class="h-[520px] w-full">
          <CroutonLayoutComposeCanvas v-model="pieces" />
        </div>
      </ClientOnly>
    </section>

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
        <div class="flex flex-wrap items-center gap-2">
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
      <p class="mb-3 text-sm text-muted">Drag the width below 640px → the left pane collapses with the chosen motion. <strong>Click the collapsed handle</strong> → it slides out as an overlay; ✕ or tap outside to close.</p>
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
