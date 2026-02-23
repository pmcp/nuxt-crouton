<script setup lang="ts">
import type { CollabAwarenessState } from '#collab-types'

interface Props {
  users: CollabAwarenessState[]
  maxVisible?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 5
})

const otherUsers = computed(() =>
  props.users.filter(u => u.user)
)

const visibleUsers = computed(() =>
  otherUsers.value.slice(0, props.maxVisible)
)

const overflowCount = computed(() =>
  Math.max(0, otherUsers.value.length - props.maxVisible)
)
</script>

<template>
  <div v-if="otherUsers.length > 0" class="flex items-center gap-1">
    <div class="flex -space-x-2">
      <div
        v-for="user in visibleUsers"
        :key="user.user.id"
        class="w-7 h-7 rounded-full border-2 border-default flex items-center justify-center text-xs font-medium"
        :style="{ backgroundColor: user.user.color + '20', color: user.user.color }"
        :title="user.user.name"
      >
        {{ user.user.name?.charAt(0)?.toUpperCase() ?? '?' }}
      </div>
      <div
        v-if="overflowCount > 0"
        class="w-7 h-7 rounded-full border-2 border-default bg-muted flex items-center justify-center text-xs font-medium text-muted"
      >
        +{{ overflowCount }}
      </div>
    </div>
  </div>
</template>
