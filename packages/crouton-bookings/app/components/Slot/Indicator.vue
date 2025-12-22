<script setup lang="ts">
interface SlotItem {
  id: string
  color?: string
  label?: string
}

interface Props {
  slots: SlotItem[]
  bookedSlotIds?: string[]
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  bookedSlotIds: () => [],
  size: 'md'
})

const sizeClasses = {
  xs: 'w-1 h-1',
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

const gapClasses = {
  xs: 'gap-1px',
  sm: 'gap-1',
  md: 'gap-1',
  lg: 'gap-1'
}

function isBooked(slotId: string): boolean {
  return props.bookedSlotIds?.includes(slotId) ?? false
}
</script>

<template>
  <div class="flex items-center justify-center" :class="gapClasses[size]">
    <div
      v-for="slot in slots"
      :key="slot.id"
      class="rounded-full transition-colors"
      :class="[
        sizeClasses[size],
        isBooked(slot.id) ? '' : 'bg-elevated'
      ]"
      :style="isBooked(slot.id) ? { backgroundColor: slot.color || '#94a3b8' } : undefined"
      :title="slot.label"
    />
  </div>
</template>
