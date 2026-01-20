<script setup lang="ts">
/**
 * @crouton-studio
 * Artifact card component for displaying collection/component/page artifacts
 *
 * Shows status indicator, expandable code preview, and action buttons
 */

import type { StudioArtifact, ArtifactStatus } from '../types/studio'

interface Props {
  artifact: StudioArtifact
}

const props = defineProps<Props>()

const emit = defineEmits<{
  apply: [artifact: StudioArtifact]
  edit: [artifact: StudioArtifact]
  delete: [artifact: StudioArtifact]
}>()

const isExpanded = ref(false)

// Status configuration
const statusConfig: Record<ArtifactStatus, { color: 'primary' | 'success' | 'warning' | 'error' | 'neutral', label: string, icon: string }> = {
  existing: { color: 'neutral', label: 'Existing', icon: 'i-heroicons-check-circle' },
  new: { color: 'primary', label: 'New', icon: 'i-heroicons-plus-circle' },
  modified: { color: 'warning', label: 'Modified', icon: 'i-heroicons-pencil-square' },
  pending: { color: 'primary', label: 'Pending', icon: 'i-heroicons-clock' },
  written: { color: 'success', label: 'Written', icon: 'i-heroicons-check-badge' },
  error: { color: 'error', label: 'Error', icon: 'i-heroicons-exclamation-triangle' }
}

const currentStatus = computed(() => statusConfig[props.artifact.status] || statusConfig.pending)

// Type configuration
const typeConfig = {
  collection: { icon: 'i-heroicons-table-cells', label: 'Collection', color: 'primary' as const },
  component: { icon: 'i-heroicons-cube', label: 'Component', color: 'success' as const },
  page: { icon: 'i-heroicons-document-text', label: 'Page', color: 'warning' as const },
  composable: { icon: 'i-heroicons-code-bracket', label: 'Composable', color: 'neutral' as const }
}

const currentType = computed(() => typeConfig[props.artifact.type] || typeConfig.collection)

// Format code for display
const formattedCode = computed(() => {
  if (!props.artifact.content) return ''
  // Try to format JSON
  if (props.artifact.type === 'collection') {
    try {
      return JSON.stringify(JSON.parse(props.artifact.content), null, 2)
    }
    catch {
      return props.artifact.content
    }
  }
  return props.artifact.content
})

// Can apply this artifact?
const canApply = computed(() => {
  return props.artifact.status === 'pending' || props.artifact.status === 'new'
})
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <!-- Type icon -->
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center"
          :class="{
            'bg-primary-100 dark:bg-primary-900/30': currentType.color === 'primary',
            'bg-success-100 dark:bg-success-900/30': currentType.color === 'success',
            'bg-warning-100 dark:bg-warning-900/30': currentType.color === 'warning',
            'bg-gray-100 dark:bg-gray-700': currentType.color === 'neutral'
          }"
        >
          <UIcon
            :name="currentType.icon"
            class="w-4 h-4"
            :class="{
              'text-primary-500': currentType.color === 'primary',
              'text-success-500': currentType.color === 'success',
              'text-warning-500': currentType.color === 'warning',
              'text-gray-500': currentType.color === 'neutral'
            }"
          />
        </div>

        <!-- Name and type -->
        <div>
          <div class="font-medium text-gray-900 dark:text-white">
            {{ artifact.name }}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-400">
            {{ currentType.label }}
          </div>
        </div>
      </div>

      <!-- Status badge -->
      <UBadge
        :color="currentStatus.color"
        variant="soft"
        size="sm"
      >
        <UIcon :name="currentStatus.icon" class="w-3 h-3 mr-1" />
        {{ currentStatus.label }}
      </UBadge>
    </div>

    <!-- Path -->
    <div class="px-4 pb-2">
      <code class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
        {{ artifact.path }}
      </code>
    </div>

    <!-- Expand/collapse code -->
    <button
      v-if="artifact.content"
      class="w-full px-4 py-2 text-left text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2 border-t border-gray-100 dark:border-gray-700"
      @click="isExpanded = !isExpanded"
    >
      <UIcon
        :name="isExpanded ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
        class="w-4 h-4"
      />
      {{ isExpanded ? 'Hide code' : 'View code' }}
    </button>

    <!-- Code preview -->
    <div
      v-if="isExpanded && artifact.content"
      class="border-t border-gray-100 dark:border-gray-700"
    >
      <pre class="p-4 text-xs overflow-x-auto bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 max-h-80"><code>{{ formattedCode }}</code></pre>
    </div>

    <!-- Actions -->
    <div
      v-if="canApply"
      class="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2"
    >
      <UButton
        color="primary"
        size="sm"
        icon="i-heroicons-play"
        @click="emit('apply', artifact)"
      >
        Apply
      </UButton>
      <UButton
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-heroicons-pencil"
        @click="emit('edit', artifact)"
      >
        Edit
      </UButton>
      <div class="flex-1" />
      <UButton
        color="error"
        variant="ghost"
        size="sm"
        icon="i-heroicons-trash"
        @click="emit('delete', artifact)"
      />
    </div>
  </div>
</template>
