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
 * It is injected into `CroutonFlow` via the `defaultNodeComponent` prop by
 * `CroutonFlowSiteFlow`. The "zoom in" affordance calls the `croutonSiteFlowZoom`
 * function the wrapper provides — descending the semantic-zoom shell from Site
 * into this page's own layout (WS1 #870).
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
    class="crouton-page-node"
    :class="{
      'crouton-page-node--selected': selected,
      'crouton-page-node--dragging': dragging,
    }"
    @dblclick="handleZoom"
  >
    <!-- Incoming wire (a parent links to this page) -->
    <Handle
      type="target"
      :position="Position.Top"
      class="crouton-page-handle"
    />

    <div class="crouton-page-node__body">
      <UIcon
        :name="icon"
        class="crouton-page-node__icon"
      />
      <div class="crouton-page-node__text">
        <span class="crouton-page-node__label">{{ displayLabel }}</span>
        <span
          v-if="subtitle"
          class="crouton-page-node__subtitle"
        >{{ subtitle }}</span>
      </div>

      <!-- Zoom-in affordance: drop from Site into this page's layout -->
      <button
        type="button"
        class="crouton-page-node__zoom"
        :title="$t('flow.page.zoom', 'Zoom into page')"
        :aria-label="$t('flow.page.zoom', 'Zoom into page')"
        @click="handleZoom"
      >
        <UIcon
          name="i-lucide-maximize-2"
          class="size-3.5"
        />
      </button>
    </div>

    <!-- Outgoing wire (this page links to a child) -->
    <Handle
      type="source"
      :position="Position.Bottom"
      class="crouton-page-handle"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

.crouton-page-node {
  @apply relative rounded-xl border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[176px] max-w-[240px] cursor-grab;
}

.crouton-page-node:hover {
  @apply -translate-y-0.5 shadow-md;
  border-color: var(--color-primary-500);
}

.crouton-page-node--selected {
  @apply ring-2;
  border-color: var(--color-primary-500);
  --tw-ring-color: color-mix(in srgb, var(--color-primary-500) 25%, transparent);
}

.crouton-page-node--dragging {
  @apply scale-105 cursor-grabbing shadow-lg;
}

.crouton-page-node__body {
  @apply flex items-center gap-2.5 px-3.5 py-2.5;
}

.crouton-page-node__icon {
  @apply size-4 shrink-0;
  color: var(--color-primary-500);
}

.crouton-page-node__text {
  @apply flex min-w-0 flex-col;
}

.crouton-page-node__label {
  @apply truncate text-sm font-medium text-neutral-900 dark:text-neutral-100;
}

.crouton-page-node__subtitle {
  @apply truncate text-xs text-neutral-500 dark:text-neutral-400;
}

.crouton-page-node__zoom {
  @apply ml-auto flex size-6 shrink-0 items-center justify-center rounded-md;
  @apply text-neutral-400 transition-all duration-150;
  @apply hover:bg-neutral-100 dark:hover:bg-neutral-800;
}

.crouton-page-node__zoom:hover {
  color: var(--color-primary-500);
}

.crouton-page-handle {
  @apply size-2 rounded-full;
  @apply bg-neutral-400 dark:bg-neutral-500;
  @apply border border-white dark:border-neutral-800;
  @apply transition-colors;
}

.crouton-page-handle:hover {
  background-color: var(--color-primary-500);
}
</style>
