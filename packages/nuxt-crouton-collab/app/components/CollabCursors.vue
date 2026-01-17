<script setup lang="ts">
import { computed } from 'vue'
import type { CollabAwarenessState } from '../types/collab'

/**
 * CollabCursors - Remote cursor overlay
 *
 * Renders other users' cursors as colored pointer SVGs with name labels.
 * Should be positioned absolutely within a container element.
 *
 * @example
 * ```vue
 * <div class="relative">
 *   <CollabCursors :users="presence.otherUsers" />
 *   <!-- Your content here -->
 * </div>
 * ```
 */
interface Props {
  users: CollabAwarenessState[]
  /** Whether to show user name labels near cursors */
  showLabels?: boolean
  /** Custom offset for cursor position (useful for scroll containers) */
  offsetX?: number
  offsetY?: number
}

const props = withDefaults(defineProps<Props>(), {
  showLabels: true,
  offsetX: 0,
  offsetY: 0
})

// Filter to users with active cursors
const usersWithCursors = computed(() =>
  props.users.filter(u => u.cursor !== null && u.cursor !== undefined)
)

// Get display name (first name or truncated)
function getDisplayName(name: string): string {
  if (!name) return ''
  const firstName = name.split(' ')[0]
  return firstName.length > 12 ? firstName.slice(0, 12) + '...' : firstName
}
</script>

<template>
  <div
    class="collab-cursors absolute inset-0 pointer-events-none overflow-hidden"
    aria-hidden="true"
  >
    <TransitionGroup name="cursor">
      <div
        v-for="userState in usersWithCursors"
        :key="userState.user?.id"
        class="collab-cursor absolute"
        :style="{
          left: `${(userState.cursor?.x || 0) + offsetX}px`,
          top: `${(userState.cursor?.y || 0) + offsetY}px`,
          transition: 'left 50ms linear, top 50ms linear'
        }"
      >
        <!-- Cursor pointer SVG -->
        <svg
          class="collab-cursor-pointer"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          :style="{ color: userState.user?.color || '#6b7280' }"
        >
          <!-- Cursor shape with stroke for visibility -->
          <path
            d="M5.65376 12.4561L5.65367 12.4562L5.67036 12.4685C5.92676 12.6627 6.25859 12.7367 6.5745 12.6653L11.0908 11.6214L14.2167 18.3477C14.2698 18.4616 14.3475 18.5621 14.4441 18.6416C14.5408 18.721 14.6539 18.7775 14.7751 18.8071C14.8963 18.8368 15.0223 18.8388 15.1444 18.8132C15.2664 18.7875 15.3812 18.7347 15.4803 18.6586L16.3962 17.9572C16.4953 17.8812 16.5764 17.7838 16.6338 17.6722C16.6912 17.5606 16.7233 17.4376 16.7279 17.3119C16.7325 17.1863 16.7095 17.0612 16.6605 16.9454C16.6114 16.8297 16.5375 16.7263 16.4441 16.6422L12.1158 12.5867L15.1441 9.55841C15.2853 9.41724 15.3758 9.2337 15.4025 9.03461C15.4292 8.83551 15.3905 8.63254 15.2923 8.45587C15.1941 8.2792 15.0416 8.13816 14.8577 8.05418C14.6738 7.9702 14.4685 7.94784 14.2708 7.99041L5.65376 12.4561Z"
            :fill="userState.user?.color || '#6b7280'"
            stroke="white"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </svg>

        <!-- Name label -->
        <span
          v-if="showLabels && userState.user?.name"
          class="collab-cursor-label absolute left-4 top-4 px-1.5 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
          :style="{ backgroundColor: userState.user?.color || '#6b7280' }"
        >
          {{ getDisplayName(userState.user.name) }}
        </span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.cursor-enter-active,
.cursor-leave-active {
  transition: opacity 0.15s ease;
}

.cursor-enter-from,
.cursor-leave-to {
  opacity: 0;
}
</style>
