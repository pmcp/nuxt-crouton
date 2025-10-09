<script setup lang="ts">
const props = defineProps<{
  item?: any
}>()
</script>

<template>
  <div v-if="item" class="w-full flex items-center justify-center">
    <UTooltip
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
  </div>
</template>
