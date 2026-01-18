<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  item: any
  layout: 'list' | 'grid' | 'cards'
  collection: string
}

const props = defineProps<Props>()

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

  <!-- Grid Layout -->
  <div
    v-else-if="layout === 'grid'"
    class="p-3 bg-default border border-default rounded-lg hover:shadow-md transition-shadow"
  >
    <div class="flex flex-col gap-2">
      <div class="flex items-start justify-between gap-2">
        <span
          v-if="displayLabel"
          class="font-medium text-default text-sm truncate flex-1"
        >
          {{ displayLabel }}
        </span>
        <code class="text-[10px] text-muted bg-muted/30 px-1 py-0.5 rounded font-mono shrink-0">
          {{ truncatedId }}
        </code>
      </div>
      <UCollapsible v-model:open="isExpanded">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          class="-ml-2"
          :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        >
          JSON
        </UButton>
        <template #content>
          <pre class="text-[10px] bg-muted/20 p-2 rounded mt-1 overflow-auto max-h-32 font-mono">{{ formattedJson }}</pre>
        </template>
      </UCollapsible>
    </div>
  </div>

  <!-- Cards Layout -->
  <div
    v-else-if="layout === 'cards'"
    class="p-4 bg-default border border-default rounded-xl hover:shadow-lg transition-shadow"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex-1 min-w-0">
          <span
            v-if="displayLabel"
            class="font-semibold text-default block truncate"
          >
            {{ displayLabel }}
          </span>
          <code class="text-xs text-muted bg-muted/30 px-1.5 py-0.5 rounded font-mono mt-1 inline-block">
            {{ truncatedId }}
          </code>
        </div>
      </div>
      <USeparator />
      <UCollapsible v-model:open="isExpanded">
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          class="-ml-2"
          :trailing-icon="isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        >
          {{ isExpanded ? 'Hide' : 'View' }} Raw Data
        </UButton>
        <template #content>
          <pre class="text-xs bg-muted/20 p-3 rounded mt-2 overflow-auto max-h-48 font-mono">{{ formattedJson }}</pre>
        </template>
      </UCollapsible>
    </div>
  </div>
</template>
