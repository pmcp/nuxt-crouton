<script setup lang="ts">
/**
 * CroutonLayoutBreakpointAuthor — the Breakpoints zoom level (L3) of the Crouton
 * Builder (WS5, #874). Author responsiveness *by demonstration*:
 *
 *  1. Drag the ruler (or pick a device) to a width — the device frame previews
 *     the layout at exactly that container width (intrinsic reflow via the
 *     renderer's `@container`).
 *  2. "Add a breakpoint here" plants a min-width checkpoint that **locks upward**.
 *  3. With a checkpoint active, collapse panes (→ gutter tabs) and switch widget
 *     variants — the changes are captured on that checkpoint and apply at and
 *     above its width.
 *
 * All edits are pure `layout-responsive` transforms over a `v-model`'d
 * `LayoutTree`; this component is just the surface. Mocks: 17 (devices), 18
 * (container context), 19 (breakpoint authoring).
 */
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { LayoutTree } from '@fyit/crouton-core/app/types/layout'
import {
  resolveLayoutAtWidth,
  listBlocks,
  patchBreakpoint,
  removeBreakpoint,
  toggleCollapsed,
  setVariant,
} from '../utils/layout-responsive'

const props = defineProps<{ modelValue: LayoutTree }>()
const emit = defineEmits<{ 'update:modelValue': [tree: LayoutTree] }>()

const tree = computed(() => props.modelValue)
function update(next: LayoutTree) {
  emit('update:modelValue', next)
}

// --- the ruler -------------------------------------------------------------
const MIN = 320
const MAX = 1600
const simWidth = ref(1280)

const DEVICES = [
  { label: 'Phone', width: 390, icon: 'i-lucide-smartphone' },
  { label: 'Tablet', width: 768, icon: 'i-lucide-tablet' },
  { label: 'Laptop', width: 1024, icon: 'i-lucide-laptop' },
  { label: 'Desktop', width: 1440, icon: 'i-lucide-monitor' },
] as const

const VARIANTS = [
  { label: 'Default', value: '' },
  { label: 'List', value: 'list' },
  { label: 'Cards', value: 'cards' },
  { label: 'Table', value: 'table' },
]

const pct = (w: number) => ((w - MIN) / (MAX - MIN)) * 100

const breakpoints = computed(() => (tree.value.breakpoints ?? []).slice().sort((a, b) => a.minWidth - b.minWidth))

const resolved = computed(() => resolveLayoutAtWidth(tree.value, simWidth.value))
/** The checkpoint we're editing = the largest one active at the current width. */
const activeMin = computed(() => resolved.value.activeBreakpoint)
const hasCheckpointHere = computed(() => breakpoints.value.some(b => b.minWidth === simWidth.value))

const blocks = computed(() => listBlocks(resolved.value.root))

function addCheckpoint() {
  update(patchBreakpoint(tree.value, simWidth.value, {}))
}
function dropCheckpoint(minWidth: number) {
  update(removeBreakpoint(tree.value, minWidth))
}
function onToggleCollapse(blockId: string) {
  if (activeMin.value === null) return
  update(toggleCollapsed(tree.value, activeMin.value, blockId))
}
function onSetVariant(blockId: string, variant: string) {
  if (activeMin.value === null) return
  update(setVariant(tree.value, activeMin.value, blockId, variant))
}
function variantOf(blockId: string) {
  return resolved.value.variants[blockId] ?? ''
}
function isCollapsed(blockId: string) {
  return resolved.value.collapsed.includes(blockId)
}
function onExpand(blockId: string) {
  // Tapping a gutter tab un-collapses it on the active checkpoint.
  onToggleCollapse(blockId)
}

// --- the scaled device frame ----------------------------------------------
const stageRef = ref<HTMLElement | null>(null)
const { width: stageW } = useElementSize(stageRef)
const frameScale = computed(() => {
  const avail = Math.max(stageW.value - 32, 240)
  return Math.min(1, avail / simWidth.value)
})
</script>

<template>
  <div class="flex h-full w-full flex-col gap-3 p-4 pt-16">
    <!-- Device presets + width readout -->
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-xs uppercase tracking-widest text-muted">responsive</span>
      <UButton
        v-for="d in DEVICES"
        :key="d.label"
        :icon="d.icon"
        :label="d.label"
        size="xs"
        :color="simWidth === d.width ? 'primary' : 'neutral'"
        :variant="simWidth === d.width ? 'soft' : 'ghost'"
        @click="simWidth = d.width"
      />
      <span class="ml-auto font-mono text-xs text-muted">{{ simWidth }}px</span>
      <UButton
        :icon="hasCheckpointHere ? 'i-lucide-check' : 'i-lucide-plus'"
        :label="hasCheckpointHere ? 'Checkpoint here' : 'Add breakpoint here'"
        size="xs"
        color="primary"
        :variant="hasCheckpointHere ? 'subtle' : 'solid'"
        :disabled="hasCheckpointHere"
        @click="addCheckpoint"
      />
    </div>

    <!-- The ruler: a min-width track with authored checkpoints (each locks upward) -->
    <div class="relative h-9 select-none">
      <input
        v-model.number="simWidth"
        type="range"
        :min="MIN"
        :max="MAX"
        step="1"
        aria-label="Container width"
        class="absolute inset-x-0 top-1/2 z-10 w-full -translate-y-1/2 accent-primary"
      >
      <!-- "locks upward" fill from the active checkpoint to the handle -->
      <div
        v-if="activeMin !== null"
        class="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary/30"
        :style="{ left: pct(activeMin) + '%', width: Math.max(0, pct(simWidth) - pct(activeMin)) + '%' }"
      />
      <button
        v-for="bp in breakpoints"
        :key="bp.minWidth"
        type="button"
        class="absolute top-0 z-20 flex -translate-x-1/2 flex-col items-center"
        :style="{ left: pct(bp.minWidth) + '%' }"
        :title="`Jump to ${bp.minWidth}px`"
        @click="simWidth = bp.minWidth"
      >
        <span
          class="size-2.5 rounded-full border-2 border-elevated transition-transform hover:scale-125"
          :class="bp.minWidth === activeMin ? 'bg-primary' : 'bg-muted'"
        />
        <span class="mt-0.5 font-mono text-[9px] text-muted">{{ bp.minWidth }}</span>
      </button>
    </div>

    <!-- The scaled device preview -->
    <div
      ref="stageRef"
      class="grid min-h-0 flex-1 place-items-start justify-center overflow-hidden rounded-xl border border-dashed border-default bg-muted/30 p-4"
    >
      <div
        class="overflow-hidden rounded-2xl border border-default bg-default shadow-xl transition-all"
        :style="{ width: simWidth + 'px', height: '520px', transform: `scale(${frameScale})`, transformOrigin: 'top center' }"
      >
        <CroutonLayoutResponsiveRenderer
          :tree="tree"
          :width="simWidth"
          @expand="onExpand"
        />
      </div>
    </div>

    <!-- Per-block overrides for the active checkpoint -->
    <div class="rounded-xl border border-default bg-elevated/50 p-3">
      <div
        v-if="activeMin === null"
        class="text-center text-xs text-muted"
      >
        No checkpoint active at {{ simWidth }}px — drag to a width and
        <span class="font-medium text-default">add a breakpoint</span> to author overrides (the base layout holds here).
      </div>
      <div
        v-else
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-2">
          <span class="text-xs uppercase tracking-widest text-muted">overrides @ ≥{{ activeMin }}px</span>
          <UButton
            icon="i-lucide-trash-2"
            label="Remove checkpoint"
            size="xs"
            color="error"
            variant="ghost"
            class="ml-auto"
            @click="dropCheckpoint(activeMin)"
          />
        </div>
        <div
          v-for="b in blocks"
          :key="b.blockId"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-default bg-default px-3 py-2"
        >
          <UIcon
            name="i-lucide-box"
            class="size-3.5 text-muted"
          />
          <span class="text-sm font-medium">{{ b.label || b.blockId }}</span>
          <span
            v-if="b.label"
            class="font-mono text-[10px] text-muted"
          >{{ b.blockId }}</span>
          <div class="ml-auto flex items-center gap-2">
            <USelect
              :model-value="variantOf(b.blockId)"
              :items="VARIANTS"
              size="xs"
              class="w-28"
              @update:model-value="(v: string) => onSetVariant(b.blockId, v)"
            />
            <UButton
              :icon="isCollapsed(b.blockId) ? 'i-lucide-panel-left-close' : 'i-lucide-panel-left'"
              :label="isCollapsed(b.blockId) ? 'Collapsed' : 'Collapse'"
              size="xs"
              :color="isCollapsed(b.blockId) ? 'primary' : 'neutral'"
              :variant="isCollapsed(b.blockId) ? 'soft' : 'ghost'"
              @click="onToggleCollapse(b.blockId)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
