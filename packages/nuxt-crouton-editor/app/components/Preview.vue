<template>
  <div class="flex justify-between items-center border rounded-md p-1 gap-1">
    <div
      class="bg-neutral h-10 overflow-x-hidden prose prose-sm w-40 text-[4px]"
      v-html="content"
    />
    <UModal :title="title || 'Content preview'" >
      <UButton
        icon="i-lucide-eye"
        size="xs"
        color="neutral"
        variant="ghost"
      />
      <template #body>
        <div class=" prose max-w-none" v-html="content" />
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  content?: string,
  title?: string
}>()
</script>