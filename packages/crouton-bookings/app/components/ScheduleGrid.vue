<script setup lang="ts">
import type { SlotItem, SlotSchedule } from '../types/booking'

interface Props {
  modelValue?: SlotSchedule | string | null
  slots?: SlotItem[] | string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  slots: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: SlotSchedule]
}>()

const days = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
]

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

// Parse schedule
const schedule = computed<SlotSchedule>(() => {
  if (!props.modelValue) return {}
  if (typeof props.modelValue === 'string') {
    try {
      const parsed = JSON.parse(props.modelValue)
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {}
    } catch {
      return {}
    }
  }
  return props.modelValue
})

const hasSchedule = computed(() => Object.keys(schedule.value).length > 0)

function isActive(slotId: string, dayValue: number): boolean {
  const slotDays = schedule.value[slotId]
  // No entry = follows open days = all active
  if (!slotDays) return true
  return slotDays.includes(dayValue)
}

function toggle(slotId: string, dayValue: number) {
  const current = { ...schedule.value }
  const slotDays = current[slotId] ? [...current[slotId]] : days.map(d => d.value)

  const index = slotDays.indexOf(dayValue)
  if (index === -1) {
    slotDays.push(dayValue)
  } else {
    slotDays.splice(index, 1)
  }

  // If all days selected, remove entry (falls back to open days)
  if (slotDays.length === 7) {
    delete current[slotId]
  } else {
    current[slotId] = slotDays
  }

  emit('update:modelValue', current)
}

function getSlotLabel(slot: SlotItem): string {
  return slot.label || slot.value || slot.id
}

function clearSchedule() {
  emit('update:modelValue', {})
}
</script>

<template>
  <div v-if="parsedSlots.length === 0" class="text-sm text-muted">
    Add time slots first to configure per-slot schedules.
  </div>

  <div v-else class="space-y-3">
    <!-- Grid: rows = slots, columns = days -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th class="text-left pr-3 pb-2 text-muted font-medium text-xs">
              Slot
            </th>
            <th
              v-for="day in days"
              :key="day.value"
              class="text-center pb-2 text-muted font-medium text-xs px-1"
            >
              {{ day.label }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="slot in parsedSlots" :key="slot.id">
            <td class="pr-3 py-1 text-default text-xs truncate max-w-[8rem]">
              {{ getSlotLabel(slot) }}
            </td>
            <td
              v-for="day in days"
              :key="day.value"
              class="text-center px-1 py-1"
            >
              <button
                type="button"
                class="w-6 h-6 rounded transition-colors"
                :class="isActive(slot.id, day.value)
                  ? 'bg-primary/20 hover:bg-primary/30'
                  : 'bg-muted/20 hover:bg-muted/30'"
                @click="toggle(slot.id, day.value)"
              >
                <span v-if="isActive(slot.id, day.value)" class="text-primary text-xs">
                  &#10003;
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="!hasSchedule" class="text-xs text-muted">
      No per-slot schedule set — all slots follow the open days.
    </p>
    <p v-else class="text-xs text-muted">
      Custom schedule active for {{ Object.keys(schedule).length }} slot{{ Object.keys(schedule).length === 1 ? '' : 's' }}.
      <button type="button" class="text-primary hover:underline" @click="clearSchedule">
        Reset all
      </button>
    </p>
  </div>
</template>
