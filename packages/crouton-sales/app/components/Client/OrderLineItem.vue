<template>
  <!-- items-start: price + qty controls align with the product name line,
       not the vertical middle of a multi-line block. py stays slim — these
       rows repeat a lot on a phone screen. -->
  <div class="flex items-start gap-3 py-1.5">
    <div class="flex-1 min-w-0 space-y-0.5">
      <p class="font-medium truncate">{{ title }}</p>
      <p
        v-for="option in options"
        :key="option"
        class="text-xs text-muted truncate flex items-center gap-1.5"
      >
        <span class="size-1 rounded-full bg-current opacity-60 shrink-0" />
        {{ option }}
      </p>
      <p v-if="remark" class="text-xs text-warning truncate flex items-center gap-1.5">
        <span class="size-1 rounded-full bg-current opacity-60 shrink-0" />
        {{ remark }}
      </p>
    </div>

    <span
      :key="price"
      class="w-16 text-right text-sm text-muted shrink-0 animate-pop"
    >
      {{ format(price) }}
    </span>

    <div class="flex items-center gap-1 shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
const { format } = useSalesCurrency()
defineProps<{
  title: string
  price: number
  options?: string[]
  /** Per-item remark (requiresRemark products) — warning-colored like
   * everywhere else remarks appear. */
  remark?: string
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
