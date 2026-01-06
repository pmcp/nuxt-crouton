<script setup lang="ts">
interface SlotItem {
  id: string
  color?: string
  label?: string
}

interface Props {
  title: string
  slots?: SlotItem[]
  bookedSlotIds?: string[]
  color?: string
  size?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  slots: () => [],
  bookedSlotIds: () => [],
  color: '#3b82f6',
  size: 'xs',
})
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span class="text-xs font-medium truncate">{{ title }}</span>
    <CroutonBookingsSlotIndicator
      v-if="props.slots && props.slots.length > 0"
      :slots="props.slots"
      :booked-slot-ids="props.bookedSlotIds"
      :color="props.color"
      :size="props.size"
    />
  </div>
</template>
