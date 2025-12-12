<script setup lang="ts">
import { CalendarDate, fromDate, toCalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date'

interface Props {
  modelValue?: Date | number | null
  year?: number
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  size?: 'xs' | 'sm' | 'md'
  isDateDisabled?: (date: Date) => boolean  // Function to disable specific dates
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  year: () => new Date().getFullYear(),
  color: 'primary',
  size: 'xs'
})

const emit = defineEmits<{
  'update:modelValue': [value: Date | null]
}>()

// Helper: Convert Date or timestamp to CalendarDate
function toCalendarDateValue(value: Date | number | null | undefined): DateValue | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  const zonedDateTime = fromDate(date, getLocalTimeZone())
  return toCalendarDate(zonedDateTime)
}

// Helper: Convert CalendarDate to Date
function calendarDateToDate(date: DateValue | null | undefined): Date | null {
  if (!date) return null
  return date.toDate(getLocalTimeZone())
}

// Create placeholder dates for each month
const months = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    placeholder: new CalendarDate(props.year, i + 1, 1)
  }))
)

// Internal date state with conversion
const internalDate = computed({
  get: () => toCalendarDateValue(props.modelValue),
  set: (value: DateValue | null | undefined) => {
    emit('update:modelValue', calendarDateToDate(value))
  }
})

// Wrapper for isDateDisabled that converts DateValue to Date
function internalIsDateDisabled(dateValue: DateValue): boolean {
  if (!props.isDateDisabled) return false
  const date = calendarDateToDate(dateValue)
  if (!date) return false
  return props.isDateDisabled(date)
}

// Check if we have a day slot
const slots = useSlots()
const hasDaySlot = computed(() => !!slots.day)
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    <div
      v-for="{ month, placeholder } in months"
      :key="month"
      class="bg-elevated rounded-lg p-3 ring ring-default"
    >
      <UCalendar
        v-model="internalDate"
        :placeholder="placeholder"
        :month-controls="false"
        :year-controls="false"
        :size="size"
        :color="color"
        :fixed-weeks="false"
        :is-date-disabled="isDateDisabled ? internalIsDateDisabled : undefined"
        class="hide-outside-days"
      >
        <template v-if="hasDaySlot" #day="{ day }">
          <slot name="day" :day="day" :date="calendarDateToDate(day)" />
        </template>
      </UCalendar>
    </div>
  </div>
</template>

<style scoped>
/* Hide days from other months */
.hide-outside-days :deep([data-outside-view]),
.hide-outside-days :deep([data-outside-month]),
.hide-outside-days :deep([data-outside-visible-months]) {
  visibility: hidden;
}
</style>
