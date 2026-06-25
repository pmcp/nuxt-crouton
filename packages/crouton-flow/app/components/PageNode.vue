<script setup lang="ts">
import { computed, inject } from 'vue'
import { Handle, Position } from '@vue-flow/core'

/**
 * CroutonFlowPageNode — the page-card node type for the Crouton Builder's Site
 * level (WS3 #872, epic #868).
 *
 * The Site level is *another view of the existing `pages` collection*: each page
 * is a draggable card here instead of a row in the pages tree, and the lines
 * between cards are the same `parentId` hierarchy. This component is the card.
 *
 * Built from standard Nuxt UI 4 primitives (`UCard` / `UButton` / `UIcon`) and
 * semantic design tokens — no bespoke colors — so it themes with the rest of the
 * app. It is injected into `CroutonFlow` via the `defaultNodeComponent` prop by
 * `CroutonFlowSiteFlow`; the zoom affordance calls the `croutonSiteFlowZoom`
 * function the wrapper provides, descending the semantic-zoom shell (WS1 #870)
 * into this page's own layout.
 */

interface Props {
  /** The page row (id, label/title, icon?, parentId?, …). */
  data: Record<string, unknown>
  selected?: boolean
  dragging?: boolean
  /** Resolved label (CroutonFlow passes the labelField value through). */
  label?: string
  collection?: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: '',
  collection: '',
})

// Provided by CroutonFlowSiteFlow — descends the zoom shell into this page.
// Defaults to a no-op so the card still renders if used outside the wrapper.
const zoomIntoPage = inject<(pageId: string) => void>('croutonSiteFlowZoom', () => {})

const pageId = computed(() => String(props.data?.id ?? ''))

const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.data?.label) return String(props.data.label)
  if (props.data?.title) return String(props.data.title)
  if (props.data?.name) return String(props.data.name)
  return pageId.value || 'Page'
})

/** A path/slug hint under the title, if the row carries one. */
const subtitle = computed(() => {
  const slug = props.data?.slug ?? props.data?.path
  return slug ? String(slug) : null
})

const icon = computed(() =>
  typeof props.data?.icon === 'string' && props.data.icon
    ? props.data.icon
    : 'i-lucide-layout-dashboard',
)

function handleZoom(event: Event) {
  event.stopPropagation()
  if (pageId.value) zoomIntoPage(pageId.value)
}
</script>

<template>
  <div
    class="crouton-page-node w-44 cursor-grab"
    :class="{ 'cursor-grabbing': dragging }"
    @dblclick="handleZoom"
  >
    <!-- Incoming wire (a parent links to this page) -->
    <Handle
      type="target"
      :position="Position.Top"
      class="crouton-page-handle"
    />

    <UCard
      variant="outline"
      :ui="{ root: 'rounded-lg transition-all duration-150', body: 'p-2.5 sm:p-2.5' }"
      :class="[
        selected ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/50',
        dragging ? 'shadow-lg' : '',
      ]"
    >
      <div class="flex items-center gap-2.5">
        <UIcon
          :name="icon"
          class="size-4 shrink-0 text-primary"
        />
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm font-medium text-highlighted">{{ displayLabel }}</span>
          <span
            v-if="subtitle"
            class="truncate text-xs text-muted"
          >{{ subtitle }}</span>
        </div>
        <UButton
          icon="i-lucide-maximize-2"
          color="neutral"
          variant="ghost"
          size="xs"
          class="ml-auto"
          :aria-label="$t('flow.page.zoom', 'Zoom into page')"
          :title="$t('flow.page.zoom', 'Zoom into page')"
          @click="handleZoom"
        />
      </div>
    </UCard>

    <!-- Outgoing wire (this page links to a child) -->
    <Handle
      type="source"
      :position="Position.Bottom"
      class="crouton-page-handle"
    />
  </div>
</template>

<style scoped>
/* Vue Flow handles only — themed off Nuxt UI design tokens (no hardcoded colors). */
.crouton-page-handle {
  height: 0.5rem;
  width: 0.5rem;
  min-width: 0;
  border-radius: 9999px;
  background: var(--ui-border-accented);
  border: 1px solid var(--ui-bg);
  transition: background-color 0.15s ease;
}
.crouton-page-handle:hover {
  background: var(--ui-primary);
}
</style>
