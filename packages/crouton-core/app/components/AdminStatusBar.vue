<script setup lang="ts">
const { currentMessage } = useAdminStatusBar()
</script>

<template>
  <div
    class="h-7 shrink-0 bg-elevated/80 backdrop-blur-sm border-t border-default flex items-center px-4 gap-2 text-xs text-muted overflow-hidden"
  >
    <TransitionGroup name="ticker" tag="div" class="relative flex items-center gap-2 min-w-0 flex-1 h-full overflow-hidden">
      <div
        v-if="currentMessage"
        :key="currentMessage.id"
        class="absolute inset-0 flex items-center gap-2"
      >
        <UIcon :name="currentMessage.icon" class="size-3 shrink-0 text-primary" />
        <span class="truncate">{{ currentMessage.text }}</span>
        <span v-if="currentMessage.collection" class="text-dimmed ml-auto shrink-0">
          {{ currentMessage.collection }} · {{ currentMessage.operation }}
        </span>
      </div>
      <div v-else key="idle" class="absolute inset-0 flex items-center gap-1.5">
        <span class="text-dimmed">Ready</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.ticker-enter-active,
.ticker-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}
.ticker-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.ticker-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
.ticker-leave-active {
  position: absolute;
}
</style>
