<script setup lang="ts">
import { computed, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'

/**
 * CroutonFlowNode - Default node component for Vue Flow
 *
 * This is the fallback node used when no custom [Collection]Node.vue exists.
 * It displays the item's title, name, or label in a styled card.
 *
 * To customize, create your own node component:
 * app/components/[Collection]Node.vue
 */

interface Props {
  /** The data item from the collection */
  data: Record<string, unknown>
  /** Whether this node is selected */
  selected?: boolean
  /** Whether this node is being dragged */
  dragging?: boolean
  /** Label to display (fallback to title/name/id) */
  label?: string
  /** Collection name for CRUD operations */
  collection?: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: '',
  collection: '',
})

// Crouton integration for edit/delete
const { open } = useCrouton()
const isHovered = ref(false)

const nodeId = computed(() => String(props.data?.id || ''))

function handleEdit(event: Event) {
  event.stopPropagation()
  if (props.collection && nodeId.value) {
    open('update', props.collection, [nodeId.value])
  }
}

function handleDelete(event: Event) {
  event.stopPropagation()
  if (props.collection && nodeId.value) {
    open('delete', props.collection, [nodeId.value])
  }
}

// Determine the display label
const displayLabel = computed(() => {
  if (props.label) return props.label
  if (props.data?.title) return String(props.data.title)
  if (props.data?.name) return String(props.data.name)
  if (props.data?.content) {
    // Truncate long content
    const content = String(props.data.content)
    return content.length > 50 ? content.slice(0, 47) + '...' : content
  }
  if (props.data?.id) return String(props.data.id)
  return 'Node'
})

// Optional subtitle (type, status, etc.)
const subtitle = computed(() => {
  if (props.data?.type) return String(props.data.type)
  if (props.data?.status) return String(props.data.status)
  return null
})
</script>

<template>
  <div
    class="crouton-flow-node"
    :class="{
      'crouton-flow-node--selected': selected,
      'crouton-flow-node--dragging': dragging
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Input handle (top) -->
    <Handle
      type="target"
      :position="Position.Top"
      class="crouton-flow-handle"
    />

    <!-- Action buttons (show on hover) -->
    <div
      v-if="collection && isHovered"
      class="crouton-flow-node__actions"
    >
      <button
        class="crouton-flow-node__action crouton-flow-node__action--edit"
        title="Edit"
        @click="handleEdit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        class="crouton-flow-node__action crouton-flow-node__action--delete"
        title="Delete"
        @click="handleDelete"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          <line x1="10" x2="10" y1="11" y2="17" />
          <line x1="14" x2="14" y1="11" y2="17" />
        </svg>
      </button>
    </div>

    <!-- Node content -->
    <div class="crouton-flow-node__content">
      <span class="crouton-flow-node__label">{{ displayLabel }}</span>
      <span v-if="subtitle" class="crouton-flow-node__subtitle">
        {{ subtitle }}
      </span>
    </div>

    <!-- Output handle (bottom) -->
    <Handle
      type="source"
      :position="Position.Bottom"
      class="crouton-flow-handle"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.crouton-flow-node {
  @apply px-4 py-2 rounded-lg border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[120px] max-w-[200px];
  @apply relative;
}

.crouton-flow-node--selected {
  @apply ring-2;
  border-color: var(--color-primary-500);
  --tw-ring-color: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
}

.crouton-flow-node--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
}

.crouton-flow-node__actions {
  @apply absolute -top-2 -right-2 flex gap-1;
  @apply z-10;
}

.crouton-flow-node__action {
  @apply w-6 h-6 rounded-full flex items-center justify-center;
  @apply bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600;
  @apply shadow-sm cursor-pointer transition-all duration-150;
  @apply hover:scale-110;
}

.crouton-flow-node__action--edit {
  @apply text-blue-600 dark:text-blue-400;
  @apply hover:bg-blue-50 dark:hover:bg-blue-900/30;
}

.crouton-flow-node__action--delete {
  @apply text-red-600 dark:text-red-400;
  @apply hover:bg-red-50 dark:hover:bg-red-900/30;
}

.crouton-flow-node__content {
  @apply flex flex-col gap-0.5;
}

.crouton-flow-node__label {
  @apply text-sm font-medium text-neutral-900 dark:text-neutral-100;
  @apply truncate;
}

.crouton-flow-node__subtitle {
  @apply text-xs text-neutral-500 dark:text-neutral-400;
  @apply capitalize;
}

.crouton-flow-handle {
  @apply w-2 h-2 rounded-full;
  @apply bg-neutral-400 dark:bg-neutral-500;
  @apply border border-white dark:border-neutral-800;
  @apply transition-colors;
}

.crouton-flow-handle:hover {
  background-color: var(--color-primary-500);
}
</style>
