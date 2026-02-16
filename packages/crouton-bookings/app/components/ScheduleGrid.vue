<script setup lang="ts">
import type { SlotItem, SlotSchedule } from '../types/booking'

interface Props {
  modelValue?: SlotSchedule | string | null
  slots?: SlotItem[] | string | null
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  slots: null,
  readonly: false,
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

const ALL_DAY_KEY = '_allDay'

const hasSlots = computed(() => parsedSlots.value.length > 0)
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
  <div class="space-y-3">
    <!-- Grid: rows = slots (or single all-day row), columns = days -->
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr>
            <th class="text-left pr-3 pb-2 text-muted font-medium text-xs">
              {{ hasSlots ? 'Slot' : '' }}
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
          <!-- Per-slot rows when slots exist -->
          <tr v-if="hasSlots" v-for="slot in parsedSlots" :key="slot.id">
            <td class="pr-3 py-1 text-default text-xs truncate max-w-[8rem]">
              {{ getSlotLabel(slot) }}
            </td>
            <td
              v-for="day in days"
              :key="day.value"
              class="text-center px-1 py-1"
            >
              <div
                v-if="readonly"
                class="w-6 h-6 rounded inline-flex items-center justify-center"
                :class="isActive(slot.id, day.value)
                  ? 'bg-primary/20'
                  : 'bg-muted/20'"
              >
                <span v-if="isActive(slot.id, day.value)" class="text-primary text-xs">
                  &#10003;
                </span>
              </div>
              <button
                v-else
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
          <!-- Single all-day row when no slots -->
          <tr v-else>
            <td class="pr-3 py-1 text-default text-xs">
              All day
            </td>
            <td
              v-for="day in days"
              :key="day.value"
              class="text-center px-1 py-1"
            >
              <div
                v-if="readonly"
                class="w-6 h-6 rounded inline-flex items-center justify-center"
                :class="isActive(ALL_DAY_KEY, day.value)
                  ? 'bg-primary/20'
                  : 'bg-muted/20'"
              >
                <span v-if="isActive(ALL_DAY_KEY, day.value)" class="text-primary text-xs">
                  &#10003;
                </span>
              </div>
              <button
                v-else
                type="button"
                class="w-6 h-6 rounded transition-colors"
                :class="isActive(ALL_DAY_KEY, day.value)
                  ? 'bg-primary/20 hover:bg-primary/30'
                  : 'bg-muted/20 hover:bg-muted/30'"
                @click="toggle(ALL_DAY_KEY, day.value)"
              >
                <span v-if="isActive(ALL_DAY_KEY, day.value)" class="text-primary text-xs">
                  &#10003;
                </span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="!readonly">
      <p v-if="!hasSchedule" class="text-xs text-muted">
        {{ hasSlots ? 'No per-slot schedule set — all slots follow the open days.' : 'All days available — toggle days to mark them as unavailable.' }}
      </p>
      <p v-else class="text-xs text-muted">
        {{ hasSlots
          ? `Custom schedule active for ${Object.keys(schedule).length} slot${Object.keys(schedule).length === 1 ? '' : 's'}.`
          : `${days.length - (schedule[ALL_DAY_KEY]?.length ?? days.length)} day${days.length - (schedule[ALL_DAY_KEY]?.length ?? days.length) === 1 ? '' : 's'} blocked.`
        }}
        <button type="button" class="text-primary hover:underline" @click="clearSchedule">
          Reset all
        </button>
      </p>
    </template>
  </div>
</template>
