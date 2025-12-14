<script setup lang="ts">
import { computed } from 'vue'
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
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dragging: false,
  label: ''
})

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
  >
    <!-- Input handle (top) -->
    <Handle
      type="target"
      :position="Position.Top"
      class="crouton-flow-handle"
    />

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
.crouton-flow-node {
  @apply px-4 py-2 rounded-lg border bg-white dark:bg-neutral-900;
  @apply border-neutral-200 dark:border-neutral-700;
  @apply shadow-sm transition-all duration-150;
  @apply min-w-[120px] max-w-[200px];
}

.crouton-flow-node--selected {
  @apply border-primary-500 ring-2 ring-primary-500/20;
}

.crouton-flow-node--dragging {
  @apply shadow-lg scale-105 cursor-grabbing;
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
  @apply bg-primary-500;
}
</style>
