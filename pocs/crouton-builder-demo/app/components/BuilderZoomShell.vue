<script setup lang="ts">
/**
 * BuilderZoomShell (#939) — a POC-local fork of `CroutonLayoutZoomShell` whose App
 * level (L1/L2) renders the spike's Vue Flow canvas (`BuilderAppCanvas`) instead of the
 * package's `CroutonLayoutComposeCanvas`. Site (crouton-flow page flow) → Page → App
 * (Vue Flow) → Breakpoints, all threading ONE shared `LayoutTree`.
 *
 * Why a fork and not a prop on the package shell: the package shell hardcodes the
 * compose canvas at the App level with no slot, and `packages/` is gated. POC-first —
 * prove the Vue Flow App level here, then extract into the package shell (e.g. an `#app`
 * slot) as a separate, approved step. Reuses the package's `useCroutonSemanticZoom`,
 * `findNestedNodes`, and `CroutonLayoutBreakpointAuthor` (all auto-imported by the layer).
 */
import { computed, ref, watch } from 'vue'
import { onKeyStroke, useEventListener } from '@vueuse/core'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'
import type { NodePath } from '@fyit/crouton-layout/app/utils/layout-edit'

interface ZoomPage {
  id: string
  label: string
  icon?: string
  tree: LayoutTree
}

const props = withDefaults(defineProps<{
  pages?: ZoomPage[]
  siteLabel?: string
}>(), {
  pages: () => [],
  siteLabel: 'Site',
})

const emit = defineEmits<{
  /** The focused page's tree changed (any level below Site). The host owns persistence. */
  layoutChange: [tree: LayoutTree]
}>()

const zoom = useCroutonSemanticZoom({ siteLabel: props.siteLabel })
const { current, depth, canZoomOut, breadcrumb } = zoom

// --- L3 Breakpoints — a live copy seeded on entry; edits bubble + propagate down ----
const bpTree = ref<LayoutTree | null>(null)
watch(current, (frame) => {
  if (frame.level === 'breakpoints' && frame.tree) bpTree.value = frame.tree
  else bpTree.value = null
}, { immediate: true })

function onBreakpointsChange(tree: LayoutTree): void {
  bpTree.value = tree
  zoom.setCurrentTree(tree)
  persistFocusedPage()
}

/** The `nested` apps in the current layout = the zoom-in targets for the toolbar. */
const apps = computed(() =>
  current.value.level === 'layout' && current.value.tree
    ? findNestedNodes(current.value.tree.root)
    : [],
)

// --- L1/L2 App level — the Vue Flow canvas, bridged to the shared tree --------------
// A stable navigation key so BuilderAppCanvas re-seeds only when you zoom (depth/level/
// label change), not on an in-place edit (which re-emits the tree at the same key).
const appSeedKey = computed(() => `${depth.value}:${current.value.level}:${current.value.label}`)

function onAppTreeChange(tree: LayoutTree): void {
  zoom.setCurrentTree(tree)
  persistFocusedPage()
}
function onAppZoom(path: NodePath): void {
  zoom.zoomIntoNested(path)
}

const levelDot: Record<string, string> = {
  site: 'bg-violet-400',
  layout: 'bg-primary',
  breakpoints: 'bg-blue-400',
}

// Per-page edited trees so zooming out to Site and back returns to your edits.
const editedPages = new Map<string, LayoutTree>()
const currentPageId = ref<string | null>(null)

function zoomIntoPageFromSlot(page: ZoomPage): void {
  currentPageId.value = page.id
  zoom.zoomIntoPage(page.label, editedPages.get(page.id) ?? page.tree)
}

function persistFocusedPage(): void {
  const pageTree = zoom.stack.value[1]?.tree
  if (!pageTree) return
  if (currentPageId.value) editedPages.set(currentPageId.value, pageTree)
  emit('layoutChange', pageTree)
}

// Scroll-up / Esc zoom out (throttled so one flick = one level).
const lastWheel = ref(0)
useEventListener('wheel', (e: WheelEvent) => {
  if (e.deltaY < -30 && Date.now() - lastWheel.value > 600) {
    lastWheel.value = Date.now()
    zoom.zoomOut()
  }
}, { passive: true })
onKeyStroke('Escape', () => zoom.zoomOut())
</script>

<template>
  <div class="croutonzoom relative h-full w-full overflow-hidden bg-default">
    <!-- Breadcrumb + zoom-out -->
    <div class="absolute top-3 left-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-full border border-default bg-elevated/90 px-3 py-1.5 text-sm backdrop-blur [scrollbar-width:none]">
      <span
        class="inline-block size-1.5 rounded-full"
        :class="levelDot[current.level]"
      />
      <template
        v-for="crumb in breadcrumb"
        :key="crumb.index"
      >
        <span
          v-if="crumb.index > 0"
          class="text-muted/50"
        >›</span>
        <button
          type="button"
          class="whitespace-nowrap transition-colors"
          :class="crumb.index === depth ? 'font-semibold text-highlighted' : 'text-muted hover:text-default'"
          @click="zoom.jumpTo(crumb.index)"
        >
          {{ crumb.label }}
        </button>
      </template>
      <UButton
        v-if="canZoomOut"
        icon="i-lucide-minimize-2"
        size="xs"
        color="neutral"
        variant="ghost"
        aria-label="Zoom out"
        @click="zoom.zoomOut()"
      />
    </div>

    <Transition
      name="zoom"
      mode="out-in"
    >
      <!-- L0 · Site — the host fills #site with the live Vue Flow page flow -->
      <div
        v-if="current.level === 'site'"
        :key="'site'"
        class="h-full w-full"
      >
        <slot
          name="site"
          :pages="props.pages"
          :zoom-into-page="zoomIntoPageFromSlot"
        >
          <div class="grid h-full w-full place-items-center p-10">
            <p class="rounded-xl border border-dashed border-default p-8 text-center text-sm text-muted">
              Provide the #site slot (CroutonFlowSiteFlow) to wire pages.
            </p>
          </div>
        </slot>
      </div>

      <!-- L3 · Breakpoints — author responsiveness by demonstration (unchanged) -->
      <div
        v-else-if="current.level === 'breakpoints'"
        :key="'bp-' + depth"
        class="h-full w-full"
      >
        <CroutonLayoutBreakpointAuthor
          v-if="bpTree"
          :model-value="bpTree"
          @update:model-value="onBreakpointsChange"
        />
      </div>

      <!-- L1/L2 · App — the Vue Flow canvas (the swap). Drop a component from the drawer,
           drag to rearrange; every edit recomposes the shared tree. Double-click a
           nested-app card to zoom in; the toolbar also lists nested apps + Breakpoints. -->
      <div
        v-else
        :key="'layout-' + depth"
        class="flex h-full w-full flex-col"
      >
        <div class="flex flex-wrap items-center gap-2 px-4 pb-2 pt-16">
          <span class="hidden text-xs text-muted sm:inline">Drag a component onto the canvas · drag to rearrange · double-click an app to zoom in</span>
          <UButton
            v-for="app in apps"
            :key="app.path.join('.')"
            :label="app.label || 'App'"
            icon="i-lucide-maximize-2"
            size="xs"
            color="neutral"
            variant="soft"
            @click="zoom.zoomIntoNested(app.path)"
          />
          <UButton
            label="Breakpoints"
            icon="i-lucide-smartphone"
            size="xs"
            color="neutral"
            variant="ghost"
            class="ml-auto"
            @click="zoom.zoomIntoBreakpoints()"
          />
        </div>
        <div class="min-h-0 flex-1 p-4 pt-0">
          <BuilderAppCanvas
            v-if="current.tree"
            :model-value="current.tree"
            :seed-key="appSeedKey"
            @update:model-value="onAppTreeChange"
            @zoom="onAppZoom"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.5, 0, 0.3, 1);
}
.zoom-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
.zoom-leave-to {
  opacity: 0;
  transform: scale(1.04);
}
</style>
