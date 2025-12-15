<script setup lang="ts">
import { computed } from 'vue'
import type { YjsAwarenessState } from '../types/yjs'

const props = defineProps<{
  users: YjsAwarenessState[]
  currentUserId?: string
}>()

const otherUsers = computed(() =>
  props.users.filter(u => u.user.id !== props.currentUserId),
)
</script>

<template>
  <div class="flow-presence">
    <!-- User avatars in corner -->
    <div class="flow-presence-avatars">
      <div
        v-for="user in otherUsers"
        :key="user.user.id"
        class="flow-presence-avatar"
        :style="{ backgroundColor: user.user.color }"
        :title="user.user.name"
      >
        {{ user.user.name.charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- Cursors on canvas (if cursor tracking enabled) -->
    <template v-for="user in otherUsers" :key="`cursor-${user.user.id}`">
      <div
        v-if="user.cursor"
        class="flow-presence-cursor"
        :style="{
          left: `${user.cursor.x}px`,
          top: `${user.cursor.y}px`,
          borderColor: user.user.color
        }"
      >
        <span
          class="flow-presence-cursor-label"
          :style="{ backgroundColor: user.user.color }"
        >
          {{ user.user.name }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.flow-presence {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.flow-presence-avatars {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: -8px;
}

.flow-presence-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.flow-presence-cursor {
  position: absolute;
  width: 20px;
  height: 20px;
  border-left: 2px solid;
  border-top: 2px solid;
  transform: rotate(-45deg);
  transform-origin: top left;
}

.flow-presence-cursor-label {
  position: absolute;
  left: 16px;
  top: -4px;
  transform: rotate(45deg);
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  white-space: nowrap;
}
</style>
