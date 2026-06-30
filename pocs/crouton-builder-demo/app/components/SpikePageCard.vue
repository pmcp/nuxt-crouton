<script setup lang="ts">
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import {
  STATUS_META, VISIBILITY_META, LAYOUT_META,
  type PageStatus, type PageVisibility, type PageLayout,
} from '~/utils/spike-page-meta'

/**
 * SpikePageCard (#940) — the Site-flow page card, the POC's richer stand-in for the
 * package's `CroutonFlowPageNode`. Same contract (injects `croutonSiteFlowZoom`,
 * source/target handles), but it's the **condensed list version of a page**: it shows
 * the page-settings at a glance — live/draft STATUS (coloured dot) and VISIBILITY /
 * permissions (icon) — exactly the chips the full page header carries, just shrunk.
 *
 * Tapping the card (or the ⤡) **opens the full page** — descends into that page's board,
 * where the same status/visibility live in the full identity header. We override the
 * package card POC-side (passed via CroutonFlow's `defaultNodeComponent`) instead of
 * editing the package; on graduation this folds back into `CroutonFlowPageNode`.
 *
 * Reads the SAME meta maps as the board page-shell (app/utils/spike-page-meta) so the
 * condensed card and the full header never drift.
 */

interface Props {
  /** The page row — enriched in spike-app to carry status / visibility / layout / icon / path. */
  data: Record<string, unknown>
  selected?: boolean
  dragging?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: '',
})

// Provided by the host (spike-app) — descends into this page's board. No-op fallback so
// the card still renders if used outside the Site flow.
const openPage = inject<(pageId: string) => void>('croutonSiteFlowZoom', () => {})

const pageId = computed(() => String(props.data?.id ?? ''))

const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.data?.label) return String(props.data.label)
  if (props.data?.title) return String(props.data.title)
  return pageId.value || 'Page'
})

const subtitle = computed(() => {
  const slug = props.data?.path ?? props.data?.slug
  return slug ? String(slug) : null
})

const icon = computed(() =>
  typeof props.data?.icon === 'string' && props.data.icon
    ? props.data.icon
    : 'i-lucide-layout-dashboard',
)

const status = computed<PageStatus | null>(() => {
  const s = props.data?.status
  return typeof s === 'string' && s in STATUS_META ? s as PageStatus : null
})
const visibility = computed<PageVisibility | null>(() => {
  const v = props.data?.visibility
  return typeof v === 'string' && v in VISIBILITY_META ? v as PageVisibility : null
})
const layout = computed<PageLayout | null>(() => {
  const l = props.data?.layout
  return typeof l === 'string' && l in LAYOUT_META ? l as PageLayout : null
})
const inNavigation = computed(() => props.data?.showInNavigation === true)

const statusMeta = computed(() => (status.value ? STATUS_META[status.value] : null))
const visibilityMeta = computed(() => (visibility.value ? VISIBILITY_META[visibility.value] : null))
const layoutMeta = computed(() => (layout.value ? LAYOUT_META[layout.value] : null))

function open(event: Event) {
  event.stopPropagation()
  if (pageId.value) openPage(pageId.value)
}
</script>

<template>
  <div
    class="spike-page-card w-48 cursor-pointer"
    :class="{ 'cursor-grabbing': dragging }"
    @dblclick="open"
  >
    <!-- Incoming wire (a parent links to this page) -->
    <Handle type="target" :position="Position.Top" class="spike-page-handle" />

    <UCard
      variant="outline"
      :ui="{ root: 'rounded-lg transition-all duration-150', body: 'p-2.5 sm:p-2.5' }"
      :class="[
        selected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50',
        dragging ? 'shadow-lg' : '',
      ]"
      @click="open"
    >
      <!-- Title row: icon · name · open affordance -->
      <div class="flex items-center gap-2.5">
        <UIcon :name="icon" class="size-4 shrink-0 text-primary" />
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-medium text-highlighted">{{ displayLabel }}</span>
          <span v-if="subtitle" class="truncate font-mono text-[11px] text-muted">{{ subtitle }}</span>
        </div>
        <UButton
          icon="i-lucide-maximize-2"
          color="neutral"
          variant="ghost"
          size="xs"
          class="ml-auto"
          aria-label="Open page"
          title="Open page"
          @click="open"
        />
      </div>

      <!-- Settings row: the condensed page-settings — status (live/draft) · permissions · layout ·
           nav. ICONS ONLY (no text labels) — cleaner; the label rides in each icon's title tooltip.
           Status keeps its colour (green=published, amber=draft, red=archived) as the live/draft cue. -->
      <div
        v-if="statusMeta || visibilityMeta || layoutMeta"
        class="mt-2 flex items-center gap-3 border-t border-default pt-2"
      >
        <UIcon
          v-if="statusMeta"
          :name="statusMeta.icon"
          class="size-3.5"
          :class="statusMeta.text"
          :title="`Status: ${statusMeta.label}`"
        />
        <UIcon
          v-if="visibilityMeta"
          :name="visibilityMeta.icon"
          class="size-3.5 text-muted"
          :title="`Visibility: ${visibilityMeta.label}`"
        />
        <UIcon
          v-if="layoutMeta"
          :name="layoutMeta.icon"
          class="size-3.5 text-muted"
          :title="`Layout: ${layoutMeta.label}`"
        />
        <UIcon
          :name="inNavigation ? 'i-lucide-eye' : 'i-lucide-eye-off'"
          class="size-3.5 text-muted"
          :title="inNavigation ? 'In navigation' : 'Hidden from nav'"
        />
      </div>
    </UCard>

    <!-- Outgoing wire (this page links to a child) -->
    <Handle type="source" :position="Position.Bottom" class="spike-page-handle" />
  </div>
</template>

<style scoped>
/* Vue Flow handles only — themed off Nuxt UI design tokens (no hardcoded colors). */
.spike-page-handle {
  height: 0.5rem;
  width: 0.5rem;
  min-width: 0;
  border-radius: 9999px;
  background: var(--ui-border-accented);
  border: 1px solid var(--ui-bg);
  transition: background-color 0.15s ease;
}
.spike-page-handle:hover {
  background: var(--ui-primary);
}
</style>
