<script setup lang="ts">
/**
 * SpikeFocusShell (#907 focus-view v2) — the "zoom into the layout" edit experience.
 *
 * Instead of a separate full-screen edit SCREEN, tapping a node makes that layout ZOOM UP in place:
 * the card animates from the node's real on-screen rect to centre (a shared-element transition — NOT
 * the Vue Flow camera, so no re-measure/framing fight), the rest of the board falls away behind a
 * blurred backdrop, and a minimal control SHELL hugs the layout — the breakpoint key-points pop up,
 * the device + width controls ride a floating pill. Apple-ish: soft translucency, spring motion, the
 * layout is the hero; the dense stuff (collapse motion / per-block variants) hides behind a "⋯" reveal.
 *
 * Composed in the POC from the layout engine's pure utils (same logic the package's BreakpointAuthor
 * uses) so the v-model + resize→keypoint contract is identical — only the presentation is bespoke.
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { LayoutTree, LayoutNode, LayoutCollapseStyle } from '@fyit/crouton-core/app/types/layout'
import { LAYOUT_COLLAPSE_STYLES, DEFAULT_COLLAPSE_STYLE } from '@fyit/crouton-core/app/types/layout'
import { applySizes, type NodePath } from '@fyit/crouton-layout/app/utils/layout-edit'
// resolveLayoutAtWidth / listBlocks / patchBreakpoint / removeBreakpoint are auto-imported from the
// crouton-layout layer (its `app/utils/layout-responsive` isn't in the package `exports` map, so an
// explicit deep import won't resolve — the auto-import is the supported surface here).

const props = defineProps<{
  modelValue: LayoutTree
  label?: string
  originRect?: { x: number, y: number, width: number, height: number } | null
}>()
const emit = defineEmits<{ 'update:modelValue': [tree: LayoutTree], close: [] }>()

const tree = computed(() => props.modelValue)
function update(next: LayoutTree) { emit('update:modelValue', next) }

// --- width / devices / breakpoints (same model as the package author) -----------------
const MIN = 320
const MAX = 1600
const simWidth = ref(390)
const DEVICES = [
  { label: 'Phone', width: 390, icon: 'i-lucide-smartphone' },
  { label: 'Tablet', width: 768, icon: 'i-lucide-tablet' },
  { label: 'Laptop', width: 1024, icon: 'i-lucide-laptop' },
  { label: 'Desktop', width: 1440, icon: 'i-lucide-monitor' },
] as const

const breakpoints = computed(() => (tree.value.breakpoints ?? []).slice().sort((a, b) => a.minWidth - b.minWidth))
const resolved = computed(() => resolveLayoutAtWidth(tree.value, simWidth.value))
const activeMin = computed(() => resolved.value.activeBreakpoint)
const hasCheckpointHere = computed(() => breakpoints.value.some(b => b.minWidth === simWidth.value))
const blocks = computed(() => listBlocks(resolved.value.root))
const collapseStyleHere = computed<LayoutCollapseStyle>(() => resolved.value.collapseStyle ?? DEFAULT_COLLAPSE_STYLE)

const NO_VARIANT = '__default'
const VARIANTS = [
  { label: 'Default', value: NO_VARIANT },
  { label: 'List', value: 'list' },
  { label: 'Cards', value: 'cards' },
  { label: 'Table', value: 'table' },
]
const COLLAPSE_LABELS: Record<LayoutCollapseStyle, string> = {
  'gutter-tabs': 'Gutter tabs',
  'spring-drawer': 'Spring drawer',
  'crt-power-down': 'CRT power-down',
  'iris-portal': 'Iris portal',
}

// Author BY DEMONSTRATION — a change at the current width snapshots a checkpoint there.
function authorHere(patch: { collapsed?: string[], variants?: Record<string, string>, collapseStyle?: LayoutCollapseStyle }) {
  const collapseStyle = patch.collapseStyle ?? resolved.value.collapseStyle
  update(patchBreakpoint(tree.value, simWidth.value, {
    collapsed: patch.collapsed ?? [...resolved.value.collapsed],
    variants: patch.variants ?? { ...resolved.value.variants },
    ...(collapseStyle !== undefined ? { collapseStyle } : {}),
  }))
}
function onSetCollapseStyle(style: LayoutCollapseStyle) { authorHere({ collapseStyle: style }) }
function onToggleCollapse(blockId: string) {
  const cur = resolved.value.collapsed
  authorHere({ collapsed: cur.includes(blockId) ? cur.filter(id => id !== blockId) : [...cur, blockId] })
}
function onSetVariant(blockId: string, variant: string) {
  const variants = { ...resolved.value.variants }
  if (variant && variant !== NO_VARIANT) variants[blockId] = variant
  else delete variants[blockId]
  authorHere({ variants })
}
function variantOf(blockId: string) { return resolved.value.variants[blockId] ?? NO_VARIANT }
function isCollapsed(blockId: string) { return resolved.value.collapsed.includes(blockId) }
function onExpand(blockId: string) { onToggleCollapse(blockId) }
function onResize(path: NodePath, sizes: number[]) {
  update(patchBreakpoint(tree.value, simWidth.value, {
    root: applySizes(resolved.value.root, path, sizes),
    collapsed: [...resolved.value.collapsed],
    variants: { ...resolved.value.variants },
    ...(resolved.value.collapseStyle !== undefined ? { collapseStyle: resolved.value.collapseStyle } : {}),
  }))
}
function jumpTo(minWidth: number) { simWidth.value = minWidth }
function dropCheckpoint(minWidth: number) { update(removeBreakpoint(tree.value, minWidth)) }
const pct = (w: number) => ((w - MIN) / (MAX - MIN)) * 100

// --- the scaled layout frame (fit to the available stage, never clipped) --------------
// TWO elements on purpose: the WRAPPER (flipRef) is sized to the real on-screen box and is the only
// thing the zoom animation touches (its transform); the INNER frame is `simWidth` px wide and Vue
// scales it down to fit (transform: scale). They never share a transform, so scrubbing the width
// always re-fits — the FLIP can't strand a stale transform on the scaled frame. And because the
// wrapper carries the true on-screen size, a (visually) scaled-down inner can't overflow the screen.
const stageRef = ref<HTMLElement | null>(null)
const { width: stageW, height: stageH } = useElementSize(stageRef)
const availW = computed(() => Math.max(240, stageW.value - 24))
const availH = computed(() => Math.max(320, stageH.value - 16))
const displayW = computed(() => Math.min(simWidth.value, availW.value))
const scale = computed(() => displayW.value / simWidth.value)
const wrapperStyle = computed(() => ({ width: `${Math.round(displayW.value)}px`, height: `${Math.round(availH.value)}px` }))
const innerStyle = computed(() => ({
  width: `${simWidth.value}px`,
  height: `${Math.round(availH.value / scale.value)}px`,
  transform: `scale(${scale.value})`,
  transformOrigin: 'top left',
}))

// --- shared-element zoom (wrapper morphs from the node's rect → centre) ----------------
const flipRef = ref<HTMLElement | null>(null)
const ready = ref(false) // gates the control-shell reveal until the zoom settles
function flipFrom(rect: { x: number, y: number, width: number, height: number }) {
  const el = flipRef.value
  if (!el) return
  const f = el.getBoundingClientRect()
  if (!f.width || !f.height) return
  el.style.transformOrigin = 'top left'
  el.style.transition = 'none'
  el.style.transform = `translate(${rect.x - f.x}px, ${rect.y - f.y}px) scale(${rect.width / f.width}, ${rect.height / f.height})`
  el.style.opacity = '0.85'
  void el.offsetWidth // force reflow so the start frame sticks
  requestAnimationFrame(() => {
    if (!flipRef.value) return
    flipRef.value.style.transition = 'transform 0.46s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease'
    flipRef.value.style.transform = 'none'
    flipRef.value.style.opacity = '1'
  })
}
onMounted(async () => {
  await nextTick()
  if (props.originRect) flipFrom(props.originRect)
  // let the zoom lead, then pop the shell + key-points in
  window.setTimeout(() => { ready.value = true }, props.originRect ? 240 : 0)
})

const closing = ref(false)
function requestClose() {
  if (closing.value) return
  const el = flipRef.value
  const o = props.originRect
  ready.value = false
  if (el && o) {
    const f = el.getBoundingClientRect()
    el.style.transformOrigin = 'top left'
    el.style.transition = 'transform 0.34s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
    el.style.transform = `translate(${o.x - f.x}px, ${o.y - f.y}px) scale(${o.width / f.width}, ${o.height / f.height})`
    el.style.opacity = '0.6'
    closing.value = true
    let done = false
    const finish = () => { if (!done) { done = true; emit('close') } }
    el.addEventListener('transitionend', finish, { once: true })
    window.setTimeout(finish, 420)
  }
  else emit('close')
}

// Advanced controls (collapse motion + per-block variant) hide behind a "⋯" reveal.
const optionsOpen = ref(false)

// --- per-panel selection (#907) — tap a panel IN the layout → its settings appear -----
// Direct manipulation: instead of a flat list of every block, you tap the actual panel and the
// options scope to it. We hit-test the tap against the layout geometry (computed from the resolved
// tree — no dependency on renderer internals), so a tap maps to the leaf block under your finger.
const selectedBlockId = ref<string | null>(null)
interface Region { blockId: string, label?: string, left: number, top: number, width: number, height: number }
function leafRegions(node: LayoutNode, left: number, top: number, width: number, height: number): Region[] {
  if (node.type === 'leaf') {
    const b = blocks.value.find(x => x.blockId === node.blockId)
    return [{ blockId: node.blockId, label: b?.label, left, top, width, height }]
  }
  if (node.type === 'nested') return leafRegions(node.layout.root, left, top, width, height)
  const horizontal = node.direction === 'horizontal'
  const sizes = node.children.map(c => (typeof (c as { defaultSize?: number }).defaultSize === 'number' ? (c as { defaultSize?: number }).defaultSize! : 100 / node.children.length))
  const total = sizes.reduce((a, b) => a + b, 0) || 1
  let off = 0
  const out: Region[] = []
  node.children.forEach((c, i) => {
    const frac = sizes[i]! / total
    if (horizontal) out.push(...leafRegions(c, left + off * width, top, frac * width, height))
    else out.push(...leafRegions(c, left, top + off * height, width, frac * height))
    off += frac
  })
  return out
}
const regions = computed(() => leafRegions(resolved.value.root, 0, 0, 100, 100))
const selectedRegion = computed(() => regions.value.find(r => r.blockId === selectedBlockId.value) ?? null)
const selectedBlock = computed(() => blocks.value.find(b => b.blockId === selectedBlockId.value) ?? null)
const multiBlock = computed(() => regions.value.length > 1)

const innerRef = ref<HTMLElement | null>(null)
function onLayoutClick(e: MouseEvent) {
  const el = innerRef.value
  if (!el || !multiBlock.value) return // single-block layout → nothing to pick
  const r = el.getBoundingClientRect()
  const px = ((e.clientX - r.left) / r.width) * 100
  const py = ((e.clientY - r.top) / r.height) * 100
  const hit = regions.value.find(rg => px >= rg.left && px <= rg.left + rg.width && py >= rg.top && py <= rg.top + rg.height)
  if (hit) { selectedBlockId.value = hit.blockId; optionsOpen.value = true }
}
// A single-block layout has nothing to pick → auto-select it so its options are right there.
watch([() => regions.value.length, () => regions.value.map(r => r.blockId).join('|')], () => {
  if (regions.value.length === 1) selectedBlockId.value = regions.value[0]!.blockId
  else if (selectedBlockId.value && !regions.value.some(r => r.blockId === selectedBlockId.value)) selectedBlockId.value = null
}, { immediate: true })
</script>

<template>
  <Teleport to="body">
    <div class="spike-focus fixed inset-0 z-50 flex flex-col">
      <!-- Blurred, dimmed backdrop — the rest of the board falls away behind it. Tap to exit. -->
      <div
        class="spike-focus__scrim absolute inset-0 bg-default/55 backdrop-blur-xl"
        @click="requestClose"
      />

      <!-- Top hairline: a tiny grabber + Done, kept minimal (Apple-ish) -->
      <div class="relative z-10 flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-elevated/70 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur transition-colors hover:text-default"
          @click="requestClose"
        >
          <UIcon name="i-lucide-chevron-down" class="size-3.5" />
          {{ label || 'Layout' }}
        </button>
        <button
          type="button"
          class="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-inverted shadow-sm transition-transform active:scale-95"
          @click="requestClose"
        >Done</button>
      </div>

      <!-- The layout — the hero. Zooms up from the node's rect, fits the stage (never clipped).
           Wrapper = on-screen box + the zoom transform; inner = simWidth px scaled to fit (Vue-owned). -->
      <div ref="stageRef" class="relative z-10 grid min-h-0 flex-1 place-items-center overflow-hidden px-3 pt-3">
        <div
          ref="flipRef"
          class="spike-focus__card overflow-hidden rounded-[1.75rem] bg-default shadow-lg ring-1 ring-default/15"
          :style="wrapperStyle"
        >
          <div ref="innerRef" class="relative" :style="innerStyle" @click="onLayoutClick">
            <CroutonLayoutResponsiveRenderer
              :tree="tree"
              :width="simWidth"
              class="h-full w-full"
              @expand="onExpand"
              @layout-change="onResize"
            />
            <!-- selection highlight: a ring over the tapped panel (geometry, %-rect) -->
            <div
              v-if="multiBlock && selectedRegion"
              class="pointer-events-none absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-default transition-all duration-200"
              :style="{ left: `${selectedRegion.left}%`, top: `${selectedRegion.top}%`, width: `${selectedRegion.width}%`, height: `${selectedRegion.height}%` }"
            />
          </div>
        </div>
      </div>

      <!-- The control SHELL — slides up and hugs the layout once the zoom settles. -->
      <Transition name="shell-rise">
        <div v-if="ready" class="relative z-10 mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-md px-3">
          <!-- key-points: poppable checkpoint chips above the pill -->
          <div class="mb-2 flex flex-wrap items-center justify-center gap-1.5">
            <button
              v-for="(bp, i) in breakpoints"
              :key="bp.minWidth"
              type="button"
              class="spike-pop flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums shadow-sm backdrop-blur transition-all"
              :class="bp.minWidth === activeMin ? 'bg-primary text-inverted' : 'bg-elevated/80 text-muted hover:text-default'"
              :style="{ animationDelay: `${i * 45}ms` }"
              @click="jumpTo(bp.minWidth)"
            >
              <UIcon name="i-lucide-git-commit-horizontal" class="size-3" />
              {{ bp.minWidth }}
            </button>
            <span
              v-if="!breakpoints.length"
              class="spike-pop rounded-full bg-elevated/70 px-2.5 py-1 text-[11px] text-muted/80 backdrop-blur"
            >change anything → a key-point lands here</span>
          </div>

          <!-- the pill: device presets · width scrubber · px · options -->
          <div class="flex flex-col gap-2 rounded-[1.75rem] border border-default/60 bg-elevated/85 p-2.5 shadow-xl backdrop-blur-xl">
            <div class="flex items-center gap-1">
              <UButton
                v-for="d in DEVICES"
                :key="d.label"
                :icon="d.icon"
                size="xs"
                :aria-label="d.label"
                :title="`${d.label} · ${d.width}px`"
                :color="simWidth === d.width ? 'primary' : 'neutral'"
                :variant="simWidth === d.width ? 'solid' : 'ghost'"
                @click="simWidth = d.width"
              />
              <span class="ml-auto rounded-full bg-default/70 px-2 py-0.5 font-mono text-[11px] tabular-nums text-muted">{{ simWidth }}px</span>
              <UButton
                :icon="optionsOpen ? 'i-lucide-chevron-up' : 'i-lucide-sliders-horizontal'"
                size="xs"
                color="neutral"
                :variant="optionsOpen ? 'soft' : 'ghost'"
                aria-label="Options"
                @click="optionsOpen = !optionsOpen"
              />
            </div>
            <div class="px-1 pb-0.5">
              <USlider v-model="simWidth" :min="MIN" :max="MAX" :step="1" size="xs" aria-label="Width" />
            </div>

            <!-- "⋯" reveal — collapse motion + per-block variant, tucked away by default -->
            <Transition name="opts">
              <div v-if="optionsOpen" class="flex flex-col gap-2 border-t border-default/50 pt-2">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] uppercase tracking-widest text-muted">Collapse motion</span>
                  <UButton
                    v-if="hasCheckpointHere"
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :title="`Remove key-point @ ${simWidth}px`"
                    @click="dropCheckpoint(simWidth)"
                  />
                </div>
                <div class="flex flex-wrap gap-1">
                  <UButton
                    v-for="s in LAYOUT_COLLAPSE_STYLES"
                    :key="s"
                    :label="COLLAPSE_LABELS[s]"
                    size="xs"
                    :color="collapseStyleHere === s ? 'primary' : 'neutral'"
                    :variant="collapseStyleHere === s ? 'solid' : 'soft'"
                    @click="onSetCollapseStyle(s)"
                  />
                </div>
                <!-- per-panel settings — scoped to the panel you tapped in the layout (#907) -->
                <div class="flex flex-col gap-1.5 border-t border-default/50 pt-2">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-square-mouse-pointer" class="size-3.5 text-muted" />
                    <span class="text-[10px] uppercase tracking-widest text-muted">Panel</span>
                    <span v-if="selectedBlock" class="truncate text-xs font-medium text-default">{{ selectedBlock.label || selectedBlock.blockId }}</span>
                    <UButton
                      v-if="selectedBlock && multiBlock"
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      aria-label="Clear selection"
                      class="ml-auto -my-1"
                      @click="selectedBlockId = null"
                    />
                  </div>
                  <p
                    v-if="!selectedBlock"
                    class="rounded-lg bg-default/50 px-2.5 py-2 text-center text-[11px] text-muted"
                  >Tap a panel in the layout to edit its variant &amp; collapse.</p>
                  <div v-else class="flex items-center gap-2 rounded-xl bg-default/60 px-2 py-1.5">
                    <USelect
                      :model-value="variantOf(selectedBlock.blockId)"
                      :items="VARIANTS"
                      size="xs"
                      class="w-28"
                      @update:model-value="(v: string) => onSetVariant(selectedBlock!.blockId, v)"
                    />
                    <UButton
                      :icon="isCollapsed(selectedBlock.blockId) ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left'"
                      :label="isCollapsed(selectedBlock.blockId) ? 'Collapsed' : 'Collapse'"
                      size="xs"
                      :color="isCollapsed(selectedBlock.blockId) ? 'primary' : 'neutral'"
                      :variant="isCollapsed(selectedBlock.blockId) ? 'soft' : 'ghost'"
                      class="ml-auto"
                      @click="onToggleCollapse(selectedBlock!.blockId)"
                    />
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style scoped>
.spike-focus__scrim { animation: scrim-in 0.32s ease both; }
@keyframes scrim-in { from { opacity: 0; } to { opacity: 1; } }

/* key-point chips "jump out" with a little spring + per-chip stagger (animationDelay inline) */
.spike-pop { animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
@keyframes pop {
  from { opacity: 0; transform: translateY(8px) scale(0.85); }
  60% { transform: translateY(-2px) scale(1.04); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* the shell rises up to meet the layout */
.shell-rise-enter-active { transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease; }
.shell-rise-leave-active { transition: transform 0.25s ease, opacity 0.2s ease; }
.shell-rise-enter-from,
.shell-rise-leave-to { opacity: 0; transform: translateY(28px); }

.opts-enter-active,
.opts-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.opts-enter-from,
.opts-leave-to { opacity: 0; transform: translateY(-6px); }
</style>
