<script setup lang="ts">
interface SlotItem {
  id: string
  label?: string
  value?: string
  color?: string
}

interface Props {
  slots?: SlotItem[] | string | null | undefined
  selectedSlotId: string | null
}

const props = defineProps<Props>()

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
      <button
        v-for="slot in normalizedSlots"
        :key="slot.id"
        type="button"
        class="p-4 rounded-lg border-2 transition-all duration-200 text-center"
        :class="[
          isSelected(slot)
            ? 'border-primary bg-primary/10 text-primary font-semibold'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700',
        ]"
        @click="emit('select', slot.id)"
      >
        <div
          v-if="slot.color"
          class="w-3 h-3 rounded-full mx-auto mb-2"
          :style="{ backgroundColor: slot.color }"
        />
        <span class="block text-sm">
          {{ getSlotLabel(slot) }}
        </span>
      </button>
    </div>
  </div>
</template>
