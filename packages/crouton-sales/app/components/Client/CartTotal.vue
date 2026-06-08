<template>
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-2">
      <span :class="labelClass">{{ t('sales.cart.total') }}</span>
      <UBadge
        v-if="count > 0"
        :key="count"
        color="primary"
        variant="solid"
        size="sm"
        class="animate-pop"
      >
        {{ count }}
      </UBadge>
    </div>
    <span :key="total" :class="['animate-pop', priceClass]">${{ total.toFixed(2) }}</span>
  </div>
</template>

<script setup lang="ts">
const { t } = useT()

const props = withDefaults(defineProps<{
  count: number
  total: number
  size?: 'sm' | 'lg'
}>(), {
  size: 'lg',
})

const labelClass = computed(() => {
  return props.size === 'sm' ? 'text-base font-medium' : 'text-lg font-semibold'
})

const priceClass = computed(() => {
  return props.size === 'sm' ? 'text-base font-semibold' : 'text-2xl font-bold'
})
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
