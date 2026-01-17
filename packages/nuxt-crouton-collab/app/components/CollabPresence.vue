<script setup lang="ts">
import { computed } from 'vue'
import type { CollabAwarenessState } from '../types/collab'

/**
 * CollabPresence - User presence avatars
 *
 * Shows stacked avatars of users in the collaboration room.
 * Each avatar displays the user's initials with their color.
 *
 * @example
 * ```vue
 * <CollabPresence
 *   :users="presence.otherUsers"
 *   :max-visible="4"
 *   size="sm"
 * />
 * ```
 */
interface Props {
  users: CollabAwarenessState[]
  maxVisible?: number
  size?: 'xs' | 'sm' | 'md'
  showTooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5,
  size: 'sm',
  showTooltip: true
})

// Visible users (capped by maxVisible)
const visibleUsers = computed(() => props.users.slice(0, props.maxVisible))

// Overflow count
const overflowCount = computed(() => {
  const overflow = props.users.length - props.maxVisible
  return overflow > 0 ? overflow : 0
})

// Get initials from user name
function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs': return 'size-6 text-xs'
    case 'sm': return 'size-8 text-sm'
    case 'md': return 'size-10 text-base'
    default: return 'size-8 text-sm'
  }
})

// Overlap offset based on size
const overlapOffset = computed(() => {
  switch (props.size) {
    case 'xs': return '-ml-2'
    case 'sm': return '-ml-2.5'
    case 'md': return '-ml-3'
    default: return '-ml-2.5'
  }
})

// Ensure text is readable on background
function getTextColor(bgColor: string): string {
  // Simple luminance check - if color looks dark, use white text
  const hex = bgColor.replace('#', '')
  if (hex.length !== 6) return 'white'

  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)

  // Luminance calculation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#1f2937' : 'white'
}
</script>

<template>
  <div
    v-if="users.length > 0"
    class="collab-presence flex items-center"
  >
    <!-- User avatars -->
    <template
      v-for="(userState, index) in visibleUsers"
      :key="userState.user?.id || index"
    >
      <UTooltip
        v-if="showTooltip && userState.user?.name"
        :text="userState.user.name"
      >
        <div
          class="collab-presence-avatar rounded-full flex items-center justify-center font-medium border-2 border-white dark:border-gray-900 shadow-sm"
          :class="[sizeClasses, index > 0 ? overlapOffset : '']"
          :style="{
            backgroundColor: userState.user?.color || '#6b7280',
            color: getTextColor(userState.user?.color || '#6b7280'),
            zIndex: visibleUsers.length - index
          }"
        >
          {{ getInitials(userState.user?.name || '') }}
        </div>
      </UTooltip>
      <div
        v-else
        class="collab-presence-avatar rounded-full flex items-center justify-center font-medium border-2 border-white dark:border-gray-900 shadow-sm"
        :class="[sizeClasses, index > 0 ? overlapOffset : '']"
        :style="{
          backgroundColor: userState.user?.color || '#6b7280',
          color: getTextColor(userState.user?.color || '#6b7280'),
          zIndex: visibleUsers.length - index
        }"
        :title="userState.user?.name"
      >
        {{ getInitials(userState.user?.name || '') }}
      </div>
    </template>

    <!-- Overflow indicator -->
    <UTooltip
      v-if="overflowCount > 0 && showTooltip"
      :text="`+${overflowCount} more`"
    >
      <div
        class="collab-presence-overflow rounded-full flex items-center justify-center font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-900 shadow-sm"
        :class="[sizeClasses, overlapOffset]"
        :style="{ zIndex: 0 }"
      >
        +{{ overflowCount }}
      </div>
    </UTooltip>
    <div
      v-else-if="overflowCount > 0"
      class="collab-presence-overflow rounded-full flex items-center justify-center font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-900 shadow-sm"
      :class="[sizeClasses, overlapOffset]"
      :style="{ zIndex: 0 }"
      :title="`+${overflowCount} more`"
    >
      +{{ overflowCount }}
    </div>
  </div>
</template>
