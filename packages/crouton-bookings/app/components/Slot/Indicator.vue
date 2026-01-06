<script setup lang="ts">
interface SlotItem {
  id: string
  label?: string
}

interface Props {
  slots: SlotItem[]
  bookedSlotIds?: string[]
  /** Color to use for booked slots (from location) */
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  bookedSlotIds: () => [],
  color: '#3b82f6',
  size: 'md'
})

const sizeClasses = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4'
}

const gapClasses = {
  xs: 'gap-1',
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-2'
}

function isBooked(slotId: string): boolean {
  return props.bookedSlotIds?.includes(slotId) ?? false
}

// Compute unfilled slot color (same hue, 25% opacity)
function getUnfilledColor(): string {
  // Use the location color with reduced opacity
  return props.color
}
</script>

<template>
  <div class="flex items-center justify-center" :class="gapClasses[size]">
    <div
      v-for="slot in slots"
      :key="slot.id"
      class="rounded-full transition-colors"
      :class="sizeClasses[size]"
      :style="{
        backgroundColor: isBooked(slot.id) ? color : getUnfilledColor(),
        opacity: isBooked(slot.id) ? 1 : 0.25
      }"
      :title="slot.label"
    />
  </div>
</template>
