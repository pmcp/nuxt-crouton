<template>
  <div class="flex items-center gap-3 py-2">
    <div class="flex-1 min-w-0 space-y-1">
      <p class="font-medium truncate">{{ title }}</p>
      <p
        v-for="option in options"
        :key="option"
        class="text-xs text-muted truncate pl-2"
      >
        {{ option }}
      </p>
    </div>

    <span
      :key="price"
      class="w-16 text-right text-sm text-muted shrink-0 animate-pop"
    >
      ${{ price.toFixed(2) }}
    </span>

    <div class="flex items-center gap-1 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  price: number
  options?: string[]
}>()
</script>

<style scoped>
.animate-pop {
  animation: pop 0.15s ease-out;
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
