<script setup lang="ts">
const props = defineProps<{
  chatCollapsed?: boolean
}>()

const emit = defineEmits<{
  'update:chatCollapsed': [value: boolean]
}>()

const collapsed = computed({
  get: () => props.chatCollapsed ?? false,
  set: (v) => emit('update:chatCollapsed', v)
})
</script>

<template>
  <div class="flex gap-4 h-[calc(100vh-14rem)]">
    <!-- Chat panel (left 1/3) -->
    <div
      v-show="!collapsed"
      class="w-1/3 min-w-80 flex flex-col border border-[var(--ui-border)] rounded-lg overflow-hidden"
    >
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
        <span class="text-sm font-medium">Chat</span>
        <UButton
          icon="i-lucide-panel-left-close"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="collapsed = true"
        />
      </div>
      <div class="flex-1 overflow-hidden">
        <slot name="chat" />
      </div>
    </div>

    <!-- Expand button when collapsed -->
    <div v-if="collapsed" class="flex flex-col">
      <UButton
        icon="i-lucide-panel-left-open"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="collapsed = false"
      />
    </div>

    <!-- Content panel (right 2/3) -->
    <div class="flex-1 min-w-0 border border-[var(--ui-border)] rounded-lg overflow-auto">
      <slot name="content" />
    </div>
  </div>
</template>
