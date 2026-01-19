<script setup lang="ts">
import { computed } from 'vue'
import type { CollabAwarenessState } from '../types/collab'

/**
 * CollabIndicator - Combined status and presence indicator
 *
 * Compact component for toolbars/headers showing connection status
 * and user avatars in a single horizontal layout.
 *
 * @example
 * ```vue
 * <CollabIndicator
 *   :connected="connection.connected"
 *   :synced="connection.synced"
 *   :error="connection.error"
 *   :users="presence.otherUsers"
 * />
 * ```
 */
interface Props {
  connected: boolean
  synced: boolean
  error?: Error | null
  users: CollabAwarenessState[]
  maxVisibleUsers?: number
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  maxVisibleUsers: 3
})

// Show presence only when connected
const showPresence = computed(() => props.connected && props.users.length > 0)
</script>

<template>
  <div class="collab-indicator inline-flex items-center gap-3">
    <!-- Connection status -->
    <CollabStatus
      :connected="connected"
      :synced="synced"
      :error="error"
      :show-label="!showPresence"
    />

    <!-- Separator when both are shown -->
    <USeparator
      v-if="showPresence"
      orientation="vertical"
      class="h-4"
    />

    <!-- User presence -->
    <CollabPresence
      v-if="showPresence"
      :users="users"
      :max-visible="maxVisibleUsers"
      size="xs"
    />
  </div>
</template>
