<script setup lang="ts">
interface UserItem {
  title?: string
  name?: string
  email?: string
  avatarUrl?: string
}

interface Props {
  item?: UserItem
  /** Show name next to avatar */
  name?: boolean
}

withDefaults(defineProps<Props>(), {
  name: false
})
</script>

<template>
  <div
    v-if="item"
    class="flex items-center gap-2"
  >
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
    <span v-if="name" class="truncate">{{ item.name }}</span>
  </div>
</template>
