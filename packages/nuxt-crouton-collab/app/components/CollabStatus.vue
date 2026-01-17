<script setup lang="ts">
import { computed } from 'vue'

/**
 * CollabStatus - Connection status indicator
 *
 * Shows connection state with colored dot and optional label.
 * - Green dot: synced and ready
 * - Yellow dot (pulsing): connecting or syncing
 * - Red dot: error or disconnected
 *
 * @example
 * ```vue
 * <CollabStatus
 *   :connected="connection.connected"
 *   :synced="connection.synced"
 *   :error="connection.error"
 * />
 * ```
 */
interface Props {
  connected: boolean
  synced: boolean
  error?: Error | null
  showLabel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  showLabel: true
})

// Computed status for styling
const status = computed(() => {
  if (props.error) return 'error'
  if (!props.connected) return 'disconnected'
  if (!props.synced) return 'syncing'
  return 'synced'
})

// Status label text
const statusLabel = computed(() => {
  switch (status.value) {
    case 'error': return 'Connection error'
    case 'disconnected': return 'Disconnected'
    case 'syncing': return 'Syncing...'
    case 'synced': return 'Synced'
    default: return ''
  }
})

// Status color classes
const dotClass = computed(() => {
  switch (status.value) {
    case 'synced': return 'bg-green-500'
    case 'syncing': return 'bg-yellow-500 animate-pulse'
    case 'disconnected': return 'bg-gray-400'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
})

// Badge variant for Nuxt UI
const badgeColor = computed(() => {
  switch (status.value) {
    case 'synced': return 'success' as const
    case 'syncing': return 'warning' as const
    case 'disconnected': return 'neutral' as const
    case 'error': return 'error' as const
    default: return 'neutral' as const
  }
})
</script>

<template>
  <div class="collab-status inline-flex items-center gap-1.5">
    <!-- Status dot with tooltip on error -->
    <UTooltip
      v-if="error"
      :text="error.message"
    >
      <span
        class="collab-status-dot size-2 rounded-full shrink-0 transition-colors duration-200"
        :class="dotClass"
      />
    </UTooltip>
    <span
      v-else
      class="collab-status-dot size-2 rounded-full shrink-0 transition-colors duration-200"
      :class="dotClass"
    />

    <!-- Optional label -->
    <span
      v-if="showLabel"
      class="collab-status-label text-xs"
      :class="{
        'text-green-600 dark:text-green-400': status === 'synced',
        'text-yellow-600 dark:text-yellow-400': status === 'syncing',
        'text-gray-500 dark:text-gray-400': status === 'disconnected',
        'text-red-600 dark:text-red-400': status === 'error'
      }"
    >
      {{ statusLabel }}
    </span>
  </div>
</template>
