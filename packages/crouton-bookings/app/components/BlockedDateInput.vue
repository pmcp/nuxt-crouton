<script setup lang="ts">
import type { BlockedDateItem, SlotItem } from '../types/booking'

interface Props {
  modelValue: BlockedDateItem
  slots?: SlotItem[] | string | null
  inventoryMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  slots: null,
  inventoryMode: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: BlockedDateItem]
}>()

// Parse slots
const parsedSlots = computed<SlotItem[]>(() => {
  if (!props.slots) return []
  if (typeof props.slots === 'string') {
    try {
      const parsed = JSON.parse(props.slots)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return Array.isArray(props.slots) ? props.slots : []
})

const showSlotRestriction = ref(
  (props.modelValue.blockedSlots?.length ?? 0) > 0,
)

function update(field: keyof BlockedDateItem, value: unknown) {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}

function toggleSlotRestriction() {
  showSlotRestriction.value = !showSlotRestriction.value
  if (!showSlotRestriction.value) {
    // Clear slot restriction (block entire day)
    update('blockedSlots', [])
  }
}

function toggleSlot(slotId: string) {
  const current = [...(props.modelValue.blockedSlots || [])]
  const index = current.indexOf(slotId)
  if (index === -1) {
    current.push(slotId)
  } else {
    current.splice(index, 1)
  }
  update('blockedSlots', current)
}

function isSlotBlocked(slotId: string): boolean {
  return props.modelValue.blockedSlots?.includes(slotId) ?? false
}

function getSlotLabel(slot: SlotItem): string {
  return slot.label || slot.value || slot.id
}
</script>

<template>
  <div class="space-y-3 p-3 rounded-lg bg-elevated ring ring-default">
    <!-- Date range -->
    <div class="flex gap-3 items-end flex-wrap">
      <UFormField label="Start Date" class="flex-1 min-w-[140px]">
        <UInput
          type="date"
          :model-value="modelValue.startDate"
          @update:model-value="update('startDate', $event)"
        />
      </UFormField>
      <UFormField label="End Date" class="flex-1 min-w-[140px]">
        <UInput
          type="date"
          :model-value="modelValue.endDate"
          @update:model-value="update('endDate', $event)"
        />
      </UFormField>
      <UFormField label="Reason" class="flex-1 min-w-[140px]">
        <UInput
          :model-value="modelValue.reason || ''"
          placeholder="Holiday, Maintenance..."
          @update:model-value="update('reason', $event)"
        />
      </UFormField>
    </div>

    <!-- Slot restriction toggle (hidden in inventory mode) -->
    <div v-if="!inventoryMode && parsedSlots.length > 0">
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        @click="toggleSlotRestriction"
      >
        {{ showSlotRestriction ? 'Block entire day' : 'Block specific slots only' }}
      </UButton>

      <!-- Slot selector -->
      <div v-if="showSlotRestriction" class="flex gap-1.5 flex-wrap mt-2">
        <UButton
          v-for="slot in parsedSlots"
          :key="slot.id"
          size="xs"
          :variant="isSlotBlocked(slot.id) ? 'soft' : 'ghost'"
          :color="isSlotBlocked(slot.id) ? 'error' : 'neutral'"
          @click="toggleSlot(slot.id)"
        >
          {{ getSlotLabel(slot) }}
        </UButton>
      </div>
      <p v-if="showSlotRestriction && (modelValue.blockedSlots?.length ?? 0) === 0" class="text-xs text-muted mt-1">
        Select which slots to block during this period.
      </p>
    </div>
  </div>
</template>
