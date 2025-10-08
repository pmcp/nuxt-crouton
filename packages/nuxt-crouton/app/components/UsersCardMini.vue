<script setup lang="ts">
const props = defineProps<{
  id: string
  collection: string
  item?: any
  pending?: boolean
  error?: any
  refresh?: () => void
}>()
</script>

<template>
  <div class="group relative inline-flex items-center gap-2">
    <!-- Avatar and Name -->
    <div class="flex items-center gap-2">
      <USkeleton v-if="pending" class="h-6 w-6 rounded-full" />
      <UTooltip v-else-if="item"
        :content="{
          align: 'center',
          side: 'top',
          sideOffset: 8
        }"
        arrow
        :text="item.title || item.name"
        :delay-duration="0"
      >
        <UAvatar
          :src="item.avatarUrl || ''"
          :alt="item.title || item.name"
          size="xs"
          class="ring-2 ring-neutral-200 dark:ring-white/10"
        />
      </UTooltip>
      <span v-else-if="error" class="text-red-500 text-sm">Error loading</span>
    </div>

  </div>
</template>
