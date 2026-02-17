<script setup lang="ts">
interface SlotItem {
  id: string
  label?: string
  value?: string
  capacity?: number
}

interface Props {
  slots?: SlotItem[] | string | null | undefined
  selectedSlotId: string | null
  /** Location color to use for slot indicators */
  color?: string
  /** Slot IDs disabled by schedule rules (distinct from demand-booked) */
  disabledSlotIds?: string[]
  /** Remaining capacity per slot ID (from availability data) */
  slotRemaining?: Record<string, number>
  /** Slot IDs that have at least one booking (for capacity display) */
  bookedSlotIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  color: '#3b82f6',
  disabledSlotIds: () => [],
  slotRemaining: () => ({}),
  bookedSlotIds: () => [],
})

const emit = defineEmits<{
  select: [slotId: string]
}>()

// Normalize slots to array
const normalizedSlots = computed<SlotItem[]>(() => {
  if (!props.slots) return []

  if (typeof props.slots === 'string') {
    try {
      const parsed = JSON.parse(props.slots)
      return Array.isArray(parsed) ? parsed : []
    }
    catch {
      return []
    }
  }

  return Array.isArray(props.slots) ? props.slots : []
})

const hasSlots = computed(() => normalizedSlots.value.length > 0)

function getSlotLabel(slot: SlotItem): string {
  return slot.label || slot.value || slot.id
}

function isSelected(slot: SlotItem): boolean {
  return props.selectedSlotId === slot.id
}

function isRuleDisabled(slot: SlotItem): boolean {
  return props.disabledSlotIds.includes(slot.id)
}

function isAtCapacity(slot: SlotItem): boolean {
  const remaining = props.slotRemaining[slot.id]
  if (remaining === undefined) return false
  return remaining <= 0
}

function isDisabled(slot: SlotItem): boolean {
  return isRuleDisabled(slot) || isAtCapacity(slot)
}

function hasMultiCapacity(slot: SlotItem): boolean {
  return (slot.capacity ?? 1) > 1
}

function getRemainingLabel(slot: SlotItem): string | null {
  if (!hasMultiCapacity(slot)) return null
  const remaining = props.slotRemaining[slot.id]
  if (remaining === undefined) return null
  if (remaining <= 0) return 'Full'
  return `${remaining} left`
}

function handleClick(slot: SlotItem) {
  if (!isDisabled(slot)) {
    emit('select', slot.id)
  }
}
</script>

<template>
  <div>
    <div v-if="!hasSlots" class="text-center py-8">
      <UIcon name="i-lucide-clock" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500">
        No time slots available for this location
      </p>
    </div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      <UButton
        v-for="slot in normalizedSlots"
        :key="slot.id"
        :variant="isDisabled(slot) ? 'ghost' : isSelected(slot) ? 'soft' : 'outline'"
        :color="isDisabled(slot) ? 'neutral' : isSelected(slot) ? 'primary' : 'neutral'"
        :disabled="isDisabled(slot)"
        class="p-4 h-auto flex-col"
        :class="isDisabled(slot) && 'opacity-40 cursor-not-allowed'"
        @click="handleClick(slot)"
      >
        <div
          v-if="color && !isDisabled(slot)"
          class="w-3 h-3 rounded-full mb-2"
          :style="{ backgroundColor: color }"
        />
        <span class="block text-sm">
          {{ getSlotLabel(slot) }}
        </span>
        <span v-if="isRuleDisabled(slot)" class="block text-xs text-muted mt-1">
          Unavailable
        </span>
        <span v-else-if="getRemainingLabel(slot)" class="block text-xs mt-1" :class="isAtCapacity(slot) ? 'text-muted' : 'text-primary'">
          {{ getRemainingLabel(slot) }}
        </span>
      </UButton>
    </div>
  </div>
</template>
