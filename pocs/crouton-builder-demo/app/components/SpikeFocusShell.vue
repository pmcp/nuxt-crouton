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
// Short labels so the 4 motion options fit one chip row (full name in the title/tooltip).
const MOTION_SHORT: Record<LayoutCollapseStyle, string> = {
  'gutter-tabs': 'Gutter',
  'spring-drawer': 'Spring',
  'crt-power-down': 'CRT',
  'iris-portal': 'Iris',
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
// Scrubbing the width makes the layout reflow (panes hit their min-width as it narrows), and the
// renderer fires `layoutChange` for that reflow too — which would author a key-point at EVERY width
// you slide through (the spam bug). So suppress onResize for a beat after any width change: a real
// splitter DRAG happens with no recent width change, a reflow happens right after one.
// Start suppressed so the layout's INITIAL settling reflow doesn't author a stray key-point at the
// opening width; cleared shortly after mount (below). Then re-suppressed on every width change.
const suppressResize = ref(true)
let suppressTimer: ReturnType<typeof setTimeout> | null = null
watch(simWidth, () => {
  suppressResize.value = true
  if (suppressTimer) clearTimeout(suppressTimer)
  suppressTimer = setTimeout(() => { suppressResize.value = false }, 350)
})
function onResize(path: NodePath, sizes: number[]) {
  if (suppressResize.value) return // reflow from a width change, not a user splitter drag
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
  // release the resize guard once the initial layout has settled (so future user drags author again)
  window.setTimeout(() => { suppressResize.value = false }, 600)
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

      <!-- Top hairline: the layout TITLE (label only — not a button) + the single exit, Done. -->
      <div class="relative z-10 flex items-center justify-between px-4 pt-4">
        <span class="flex items-center gap-1.5 rounded-full bg-elevated/70 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur">
          <UIcon name="i-lucide-layout-template" class="size-3.5 text-primary" />
          {{ label || 'Layout' }}
        </span>
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
            <!-- selection focus: dim the OTHER panels so the tapped one stands out — no hard ring -->
            <template v-if="multiBlock && selectedBlockId">
              <div
                v-for="(rg, i) in regions"
                v-show="rg.blockId !== selectedBlockId"
                :key="i"
                class="pointer-events-none absolute bg-default/55 transition-opacity duration-200"
                :style="{ left: `${rg.left}%`, top: `${rg.top}%`, width: `${rg.width}%`, height: `${rg.height}%` }"
              />
            </template>
          </div>
        </div>
      </div>

      <!-- The control SHELL — slides up and hugs the layout once the zoom settles. -->
      <Transition name="shell-rise">
        <div v-if="ready" class="relative z-10 mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] w-full max-w-md px-3">
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
              <!-- breakpoints as dots ON the track at their px position; tap → popover with the px,
                   green dot when it's the active breakpoint (the one applied at the current width). -->
              <div v-if="breakpoints.length" class="relative mt-1.5 h-3">
                <UPopover v-for="bp in breakpoints" :key="bp.minWidth">
                  <button
                    type="button"
                    class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5"
                    :style="{ left: `${pct(bp.minWidth)}%` }"
                    :aria-label="`Breakpoint ${bp.minWidth}px`"
                    @click="jumpTo(bp.minWidth)"
                  >
                    <span
                      class="block size-2.5 rounded-full ring-2 ring-elevated transition-colors"
                      :class="bp.minWidth === activeMin ? 'bg-primary' : 'bg-muted'"
                    />
                  </button>
                  <template #content>
                    <div class="flex items-center gap-1.5 px-2 py-1.5">
                      <span
                        class="size-1.5 rounded-full"
                        :class="bp.minWidth === activeMin ? 'bg-primary' : 'bg-muted'"
                      />
                      <span class="font-mono text-xs tabular-nums">{{ bp.minWidth }}px</span>
                      <UButton
                        icon="i-lucide-trash-2"
                        size="xs"
                        color="error"
                        variant="ghost"
                        aria-label="Remove breakpoint"
                        @click="dropCheckpoint(bp.minWidth)"
                      />
                    </div>
                  </template>
                </UPopover>
              </div>
            </div>

            <!-- "⋯" reveal — compact: collapse motion (a select) + the selected panel, two slim rows -->
            <Transition name="opts">
              <div v-if="optionsOpen" class="flex flex-col gap-2 border-t border-default/50 pt-2">
                <!-- collapse motion (layout-wide) — tappable chips, no dropdown -->
                <div class="flex items-center gap-2">
                  <span class="w-12 shrink-0 text-[10px] uppercase tracking-widest text-muted">Motion</span>
                  <div class="flex flex-1 gap-1 overflow-x-auto">
                    <UButton
                      v-for="s in LAYOUT_COLLAPSE_STYLES"
                      :key="s"
                      :label="MOTION_SHORT[s]"
                      :title="COLLAPSE_LABELS[s]"
                      size="xs"
                      class="shrink-0"
                      :color="collapseStyleHere === s ? 'primary' : 'neutral'"
                      :variant="collapseStyleHere === s ? 'solid' : 'soft'"
                      @click="onSetCollapseStyle(s)"
                    />
                  </div>
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
                <!-- the panel you tapped — name + collapse, then its variant chips -->
                <template v-if="selectedBlock">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-square-mouse-pointer" class="size-3.5 shrink-0 text-primary" />
                    <span class="min-w-0 flex-1 truncate text-xs font-medium">{{ selectedBlock.label || selectedBlock.blockId }}</span>
                    <UButton
                      :icon="isCollapsed(selectedBlock.blockId) ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left'"
                      :label="isCollapsed(selectedBlock.blockId) ? 'Collapsed' : 'Collapse'"
                      size="xs"
                      :color="isCollapsed(selectedBlock.blockId) ? 'primary' : 'neutral'"
                      :variant="isCollapsed(selectedBlock.blockId) ? 'soft' : 'ghost'"
                      @click="onToggleCollapse(selectedBlock!.blockId)"
                    />
                    <UButton
                      v-if="multiBlock"
                      icon="i-lucide-x"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      aria-label="Clear selection"
                      @click="selectedBlockId = null"
                    />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="w-12 shrink-0 text-[10px] uppercase tracking-widest text-muted">Widget</span>
                    <div class="flex flex-1 gap-1 overflow-x-auto">
                      <UButton
                        v-for="vr in VARIANTS"
                        :key="vr.value"
                        :label="vr.label"
                        size="xs"
                        class="shrink-0"
                        :color="variantOf(selectedBlock.blockId) === vr.value ? 'primary' : 'neutral'"
                        :variant="variantOf(selectedBlock.blockId) === vr.value ? 'solid' : 'soft'"
                        @click="onSetVariant(selectedBlock!.blockId, vr.value)"
                      />
                    </div>
                  </div>
                </template>
                <p v-else class="py-0.5 text-center text-[11px] text-muted">Tap a panel in the layout to edit it</p>
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
