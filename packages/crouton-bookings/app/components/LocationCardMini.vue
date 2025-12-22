<script setup lang="ts">
interface SlotItem {
  id: string
  color?: string
  label?: string
}

interface Props {
  title: string
  slots?: SlotItem[]
}

defineProps<Props>()
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span class="text-xs font-medium">{{ title }}</span>
    <CroutonBookingSlotIndicator
      v-if="slots && slots.length > 0"
      :slots="slots"
      :booked-slot-ids="[]"
      size="xs"
    />
  </div>
</template>
