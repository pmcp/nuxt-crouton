<script setup lang="ts">
import { ref, computed } from 'vue'
import type { GridSize } from '../types/table'

interface Props {
  item: any
  layout: 'list' | 'grid'
  collection: string
  /** Grid size variant (only used when layout='grid') */
  size?: GridSize
}

const props = withDefaults(defineProps<Props>(), {
  size: 'comfortable'
})

const isExpanded = ref(false)

// Get display label - try common fields in order
const displayLabel = computed(() => {
  const tryFields = ['name', 'title', 'label', 'slug', 'email', 'username']
  for (const field of tryFields) {
    if (props.item[field]) {
      return String(props.item[field])
    }
  }
  return null
})

// Format JSON for display
const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.item, null, 2)
  } catch {
    return '{}'
  }
})

// Truncate ID for display
const truncatedId = computed(() => {
  const id = String(props.item.id || '')
  if (id.length > 12) {
    return `${id.slice(0, 6)}...${id.slice(-4)}`
  }
  return id
})

// Grid card classes based on size
const gridCardClasses = computed(() => {
  switch (props.size) {
    case 'compact':
      return 'p-2 bg-default border border-default rounded-lg hover:shadow-md transition-shadow'
    case 'spacious':
      return 'p-4 bg-default border border-default rounded-xl hover:shadow-lg transition-shadow'
    case 'comfortable':
    default:
      return 'p-3 bg-default border border-default rounded-lg hover:shadow-md transition-shadow'
  }
})

// Grid content gap based on size
const gridGapClasses = computed(() => {
  return props.size === 'spacious' ? 'flex flex-col gap-3' : 'flex flex-col gap-2'
})

// Text size for ID based on grid size
const idTextClasses = computed(() => {
  return props.size === 'compact'
    ? 'text-[10px] text-muted bg-muted/30 px-1 py-0.5 rounded font-mono shrink-0'
    : 'text-xs text-muted bg-muted/30 px-1.5 py-0.5 rounded font-mono shrink-0'
})

// Label text classes based on size
const labelTextClasses = computed(() => {
  switch (props.size) {
    case 'compact':
      return 'font-medium text-default text-xs truncate flex-1'
    case 'spacious':
      return 'font-semibold text-default text-base truncate flex-1'
    case 'comfortable':
    default:
      return 'font-medium text-default text-sm truncate flex-1'
  }
})

// JSON pre classes based on size
const jsonPreClasses = computed(() => {
  switch (props.size) {
    case 'compact':
      return 'text-[10px] bg-muted/20 p-2 rounded mt-1 overflow-auto max-h-24 font-mono'
    case 'spacious':
      return 'text-xs bg-muted/20 p-3 rounded mt-2 overflow-auto max-h-48 font-mono'
    case 'comfortable':
    default:
      return 'text-[11px] bg-muted/20 p-2 rounded mt-1 overflow-auto max-h-32 font-mono'
  }
})
</script>

<template>
  <!-- List Layout -->
  <div
    v-if="layout === 'list'"
    class="flex items-center gap-3"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span
          v-if="displayLabel"
          class="font-medium text-default truncate"
        >
          {{ displayLabel }}
        </span>
        <code class="text-xs text-muted bg-muted/30 px-1.5 py-0.5 rounded font-mono">
          {{ truncatedId }}
        </code>
      </div>
      <UCollapsible v-model:open="isExpanded">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          class="mt-1 -ml-2"
          :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        >
          {{ isExpanded ? 'Hide' : 'Show' }} JSON
        </UButton>
        <template #content>
          <pre class="text-xs bg-muted/20 p-3 rounded mt-2 overflow-auto max-h-64 font-mono">{{ formattedJson }}</pre>
        </template>
      </UCollapsible>
    </div>
  </div>

  <!-- Grid Layout (with size variants) -->
  <div
    v-else-if="layout === 'grid'"
    :class="gridCardClasses"
  >
    <div :class="gridGapClasses">
      <div class="flex items-start justify-between gap-2">
        <span
          v-if="displayLabel"
          :class="labelTextClasses"
        >
          {{ displayLabel }}
        </span>
        <code :class="idTextClasses">
          {{ truncatedId }}
        </code>
      </div>
      <USeparator v-if="size === 'spacious'" />
      <UCollapsible v-model:open="isExpanded">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          class="-ml-2"
          :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        >
          {{ size === 'spacious' ? (isExpanded ? 'Hide' : 'View') + ' Raw Data' : 'JSON' }}
        </UButton>
        <template #content>
          <pre :class="jsonPreClasses">{{ formattedJson }}</pre>
        </template>
      </UCollapsible>
    </div>
  </div>
</template>
