<script setup lang="ts">
/**
 * Board (#988) — `/builder/[pageId]`. Deep-linkable; browser back returns to the Site
 * flow. Composes one page's `LayoutTree` through the graduated package:
 *  - `CroutonLayoutEditableRenderer` owns the pane handles (reorder / detach, #985).
 *  - `applyPaneDrop` (#985) places a palette block beside the hovered pane.
 *  - `CroutonLayoutRenderer` (read-only) previews it hug-aware (#986).
 *  - `serializeLayoutDocument` + the #974 endpoint round-trip it onto a ticket.
 * Reproduces the five `data-handoff` hooks verbatim (page-badge · region-pill · floor
 * -readout · snap-guide · ghost-pane), so one exploratory agent runs identically on the
 * POC and this app. A matching `view-transition-name` morphs the Site card into the board.
 */
import type { LayoutNode } from '@fyit/crouton-core/app/types/layout'
import { applyPaneDrop, type PaneDropEdge, type NodePath } from '@fyit/crouton-layout/app/utils/layout-edit'
import { deriveSizing } from '@fyit/crouton-layout/app/utils/layout-viability'

const route = useRoute()
const router = useRouter()
const pageId = computed(() => String(route.params.pageId))

const { getPage, setPageTree, serialize } = useBuilderDocument()
const { blocks } = useCroutonLayoutBlocks()

const page = computed(() => getPage(pageId.value))
const root = computed<LayoutNode | null>(() => page.value?.tree.root ?? null)

useHead(() => ({ title: page.value ? `Builder · ${page.value.name}` : 'Builder · not found' }))

// --- editable tree (reorder / detach via the package renderer) -------------------
function onUpdateNode(node: LayoutNode) {
  setPageTree(pageId.value, node)
}
function onDetach(payload: { path: NodePath, node: LayoutNode }) {
  // MVP: a detached pane is removed from the board (the host's placement decision —
  // a fuller app would float it as a free draft card, the POC's board behaviour).
  if (root.value && root.value.type === 'split') {
    const remaining = root.value.children.filter((_, i) => i !== payload.path[0])
    const next: LayoutNode = remaining.length === 1
      ? remaining[0]!
      : { ...root.value, children: remaining }
    setPageTree(pageId.value, next)
  }
}

// --- floor readout (deriveSizing, #986 contract) ---------------------------------
const floor = computed(() => (root.value ? deriveSizing(root.value, blocks.value) : null))

// --- regions (a hug bar at an edge = a pinned region) ----------------------------
const regions = computed(() => {
  const r = root.value
  if (!r || r.type !== 'split' || r.direction !== 'vertical') return [] as { region: 'top' | 'bottom', label: string }[]
  const out: { region: 'top' | 'bottom', label: string }[] = []
  const first = r.children[0]
  const last = r.children[r.children.length - 1]
  if (first?.type === 'leaf' && first.blockId === 'top-bar') out.push({ region: 'top', label: 'Top bar' })
  if (last?.type === 'leaf' && last.blockId === 'bottom-nav') out.push({ region: 'bottom', label: 'Bottom nav' })
  return out
})

// --- palette + place-a-block (applyPaneDrop, #985) -------------------------------
const palette = computed(() =>
  ['overview', 'artists-list', 'artists-form', 'bookings-chart', 'top-bar', 'bottom-nav']
    .map(id => blocks.value[id])
    .filter((b): b is NonNullable<typeof b> => Boolean(b)),
)
const defaultConfig: Record<string, Record<string, unknown>> = {
  'overview': { label: 'Overview', kind: 'panel', icon: 'i-lucide-layout-dashboard' },
  'artists-list': { label: 'List', kind: 'panel', variant: 'rows', icon: 'i-lucide-list' },
  'artists-form': { label: 'Form', kind: 'panel', icon: 'i-lucide-square-pen' },
  'bookings-chart': { label: 'Chart', kind: 'panel', icon: 'i-lucide-bar-chart-3' },
  'top-bar': { label: 'Top bar', kind: 'bar', icon: 'i-lucide-panel-top' },
  'bottom-nav': { label: 'Nav', kind: 'nav', icon: 'i-lucide-panel-bottom' },
}

const placing = ref<string | null>(null) // the blockId being placed
const boardRef = ref<HTMLElement | null>(null)
const arm = ref<{ index: number, edge: PaneDropEdge, rect: { left: number, top: number, width: number, height: number } } | null>(null)

function startPlacing(blockId: string) {
  placing.value = placing.value === blockId ? null : blockId
  arm.value = null
}

function onBoardMove(e: PointerEvent) {
  if (!placing.value || !boardRef.value) return
  const board = boardRef.value.getBoundingClientRect()
  const panes = Array.from(boardRef.value.querySelectorAll<HTMLElement>('[data-pane-id]'))
    .filter(el => el.dataset.paneId !== 'root')
  for (let i = 0; i < panes.length; i++) {
    const r = panes[i]!.getBoundingClientRect()
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) continue
    // quadrant → nearest edge
    const relX = (e.clientX - (r.left + r.width / 2)) / r.width
    const relY = (e.clientY - (r.top + r.height / 2)) / r.height
    const edge: PaneDropEdge = Math.abs(relX) >= Math.abs(relY) ? (relX >= 0 ? 'right' : 'left') : (relY >= 0 ? 'bottom' : 'top')
    arm.value = {
      index: i,
      edge,
      rect: { left: r.left - board.left, top: r.top - board.top, width: r.width, height: r.height },
    }
    return
  }
  arm.value = null
}

function commitPlace() {
  const a = arm.value
  const blockId = placing.value
  if (!a || !blockId || !root.value) return
  const def = blocks.value[blockId]
  const child: LayoutNode = {
    type: 'leaf',
    blockId,
    config: defaultConfig[blockId] ?? {},
    ...(def?.defaultSize !== undefined ? { defaultSize: def.defaultSize } : {}),
  }
  setPageTree(pageId.value, applyPaneDrop(root.value, { path: [a.index], edge: a.edge }, child))
  placing.value = null
  arm.value = null
}

function cancelPlace() {
  placing.value = null
  arm.value = null
}

onMounted(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelPlace() }
  window.addEventListener('keydown', onKey)
  onUnmounted(() => window.removeEventListener('keydown', onKey))
})

// snap-guide band styling for the armed edge
const guideStyle = computed(() => {
  const a = arm.value
  if (!a) return {}
  const thick = 4
  const base = { position: 'absolute' as const, background: 'var(--ui-primary)', borderRadius: '3px', zIndex: 20 }
  if (a.edge === 'left' || a.edge === 'right') {
    return { ...base, top: `${a.rect.top + 6}px`, height: `${a.rect.height - 12}px`, width: `${thick}px`, left: `${a.rect.left + (a.edge === 'right' ? a.rect.width - thick : 0)}px` }
  }
  return { ...base, left: `${a.rect.left + 6}px`, width: `${a.rect.width - 12}px`, height: `${thick}px`, top: `${a.rect.top + (a.edge === 'bottom' ? a.rect.height - thick : 0)}px` }
})
const ghostStyle = computed(() => {
  const a = arm.value
  if (!a) return {}
  const half = 0.42
  const horiz = a.edge === 'left' || a.edge === 'right'
  const w = horiz ? a.rect.width * half : a.rect.width
  const h = horiz ? a.rect.height : a.rect.height * half
  const left = a.edge === 'right' ? a.rect.left + a.rect.width - w : a.rect.left
  const top = a.edge === 'bottom' ? a.rect.top + a.rect.height - h : a.rect.top
  return { position: 'absolute' as const, left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px`, zIndex: 19 }
})

// --- preview at different sizes (the layout engine's whole point) ----------------
// Preview renders through CroutonLayoutResponsiveRenderer at a SIMULATED width, so you
// see the layout reflow: panes stack (@container), hug bars stay short, breakpoints
// resolve. Device presets + a width slider drive it; `null` = full (measure the frame).
const showPreview = ref(false)
const DEVICES = [
  { label: 'Phone', w: 390, icon: 'i-lucide-smartphone' },
  { label: 'Tablet', w: 768, icon: 'i-lucide-tablet' },
  { label: 'Laptop', w: 1024, icon: 'i-lucide-laptop' },
  { label: 'Full', w: null, icon: 'i-lucide-maximize' },
] as const
const previewWidth = ref<number | null>(null)

const issueNumber = ref<number | null>(null)
const posting = ref(false)
const postResult = ref<{ ok: boolean, message: string, url?: string } | null>(null)

async function postToTicket() {
  posting.value = true
  postResult.value = null
  try {
    const res = await $fetch<{ ok: boolean, posted: boolean, url?: string, body?: string, message: string }>('/api/builder/post-layout', {
      method: 'POST',
      body: { document: serialize(), issue: issueNumber.value },
    })
    postResult.value = { ok: res.ok, message: res.message, url: res.url }
  }
  catch (err) {
    postResult.value = { ok: false, message: err instanceof Error ? err.message : 'Failed to post' }
  }
  finally {
    posting.value = false
  }
}
</script>

<template>
  <div v-if="!page" class="mx-auto max-w-xl p-10 text-center">
    <UIcon name="i-lucide-file-question" class="mx-auto size-10 text-muted" />
    <h1 class="mt-3 text-lg font-semibold">Page not found</h1>
    <UButton class="mt-4" to="/builder" icon="i-lucide-arrow-left" variant="soft">Back to Site flow</UButton>
  </div>

  <div v-else class="flex h-dvh flex-col" :style="{ viewTransitionName: `page-${page.id}` }">
    <!-- Header -->
    <header class="flex flex-wrap items-center gap-2 border-b border-default px-4 py-2">
      <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" @click="router.back()" />
      <h1 class="text-base font-bold">{{ page.name }}</h1>
      <UBadge
        v-if="page.isHome"
        data-handoff="page-badge"
        color="primary"
        variant="solid"
        size="xs"
      >
        <UIcon name="i-lucide-star" class="size-3" /> Home
      </UBadge>

      <!-- region pills (a hug bar pinned at an edge) -->
      <UBadge
        v-for="r in regions"
        :key="r.region"
        data-handoff="region-pill"
        :data-region="r.region"
        color="info"
        variant="subtle"
        size="xs"
      >
        <UIcon :name="r.region === 'top' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'" class="size-3" />
        {{ r.label }}
      </UBadge>

      <div class="ml-auto flex items-center gap-2">
        <!-- floor readout (deriveSizing) -->
        <span
          v-if="floor"
          data-handoff="floor-readout"
          :data-hard-floor="floor.hardMinWidth"
          :data-soft-floor="floor.softMinWidth"
          class="rounded-md border border-default bg-elevated/60 px-2 py-1 font-mono text-[11px] text-muted"
        >
          stacks &lt;{{ floor.softMinWidth }}px · floor {{ floor.hardMinWidth }}px
        </span>
        <UButton
          :icon="showPreview ? 'i-lucide-pencil' : 'i-lucide-eye'"
          size="sm"
          variant="soft"
          color="neutral"
          @click="showPreview = !showPreview"
        >
          {{ showPreview ? 'Edit' : 'Preview' }}
        </UButton>
      </div>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- Palette -->
      <aside v-if="!showPreview" class="w-44 shrink-0 overflow-y-auto border-r border-default p-2">
        <p class="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">Blocks</p>
        <button
          v-for="b in palette"
          :key="b.id"
          type="button"
          class="mb-1 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition"
          :class="placing === b.id ? 'border-primary bg-primary/10 text-primary' : 'border-default hover:border-primary/60'"
          @click="startPlacing(b.id)"
        >
          <UIcon :name="b.icon" class="size-4" />
          <span class="truncate">{{ b.name }}</span>
        </button>
        <p v-if="placing" class="mt-2 px-1 text-[11px] text-primary">
          Click a pane edge to place · Esc to cancel
        </p>
      </aside>

      <!-- Board -->
      <main class="relative min-w-0 flex-1 overflow-auto p-4">
        <!-- EDIT: the package's editable renderer OWNS its pane handles (#985) -->
        <div
          v-if="root && !showPreview"
          ref="boardRef"
          class="relative h-full min-h-[420px] w-full rounded-xl border border-default bg-default/20 p-2"
          :class="placing ? 'cursor-copy' : ''"
          @pointermove="onBoardMove"
          @click="placing && commitPlace()"
        >
          <CroutonLayoutEditableRenderer
            :node="root"
            :editable="!placing"
            @update:node="onUpdateNode"
            @detach="onDetach"
          />

          <!-- place preview: snap-guide on the armed edge + ghost-pane slot -->
          <div
            v-if="arm"
            data-handoff="snap-guide"
            :data-armed="placing ? 'true' : 'false'"
            :style="guideStyle"
          />
          <div
            v-if="arm"
            data-handoff="ghost-pane"
            class="flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 text-[11px] font-semibold text-primary"
            :style="ghostStyle"
          >
            drops here
          </div>
        </div>

        <!-- PREVIEW at a chosen size — read-only, hug-aware (#986), reflows via @container -->
        <div
          v-else-if="root && page"
          class="flex h-full flex-col gap-3"
        >
          <div class="flex flex-wrap items-center gap-1.5">
            <UButton
              v-for="d in DEVICES"
              :key="d.label"
              :icon="d.icon"
              size="xs"
              :color="previewWidth === d.w ? 'primary' : 'neutral'"
              :variant="previewWidth === d.w ? 'solid' : 'soft'"
              @click="previewWidth = d.w"
            >
              {{ d.label }}
            </UButton>
            <input
              type="range"
              min="320"
              max="1280"
              step="10"
              :value="previewWidth ?? 1280"
              class="ml-2 w-40 accent-primary"
              @input="previewWidth = Number(($event.target as HTMLInputElement).value)"
            >
            <span class="font-mono text-[11px] text-muted">{{ previewWidth ? `${previewWidth}px` : 'full' }}</span>
          </div>

          <div class="flex flex-1 justify-center overflow-auto rounded-xl border border-default bg-default/20 p-3">
            <div
              class="h-full min-h-[420px] shrink-0 overflow-hidden rounded-lg border border-default bg-elevated/30 shadow-lg transition-[width] duration-300"
              :style="{ width: previewWidth ? `${previewWidth}px` : '100%', maxWidth: '100%' }"
            >
              <CroutonLayoutResponsiveRenderer
                :tree="page.tree"
                :width="previewWidth ?? undefined"
                :interactive="false"
                class="h-full w-full"
              />
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Round-trip footer (#974) -->
    <footer class="flex flex-wrap items-center gap-2 border-t border-default px-4 py-2">
      <UIcon name="i-lucide-git-pull-request-arrow" class="size-4 text-muted" />
      <span class="text-xs text-muted">Round-trip this layout onto a GitHub issue:</span>
      <UInput
        v-model.number="issueNumber"
        type="number"
        size="xs"
        placeholder="issue #"
        class="w-24"
      />
      <UButton size="xs" :loading="posting" icon="i-lucide-send" @click="postToTicket">
        Post layout
      </UButton>
      <span
        v-if="postResult"
        class="text-xs"
        :class="postResult.ok ? 'text-success' : 'text-error'"
      >
        {{ postResult.message }}
        <NuxtLink v-if="postResult.url" :to="postResult.url" target="_blank" class="underline">view</NuxtLink>
      </span>
    </footer>
  </div>
</template>
