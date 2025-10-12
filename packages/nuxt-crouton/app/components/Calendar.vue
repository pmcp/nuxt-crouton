<script setup lang="ts">
import { fromDate, toCalendarDate, getLocalTimeZone, type DateValue } from '@internationalized/date'

// DateRange interface - defined in Nuxt UI but not exported from @internationalized/date
interface DateRange {
  start: DateValue | undefined
  end: DateValue | undefined
}

interface Props {
  date?: Date | number | null       // Date or timestamp for single date
  range?: boolean                   // Enable range selection
  startDate?: Date | number | null  // Start date or timestamp for range
  endDate?: Date | number | null    // End date or timestamp for range
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  minDate?: Date | number | null    // Min selectable date or timestamp
  maxDate?: Date | number | null    // Max selectable date or timestamp
  monthControls?: boolean           // Show month controls
  yearControls?: boolean            // Show year controls
  numberOfMonths?: number           // Number of months to display
}

const props = withDefaults(defineProps<Props>(), {
  date: null,
  range: false,
  startDate: null,
  endDate: null,
  color: 'primary',
  variant: 'solid',
  size: 'md',
  disabled: false,
  minDate: null,
  maxDate: null,
  monthControls: true,
  yearControls: true,
  numberOfMonths: undefined
})

const emit = defineEmits<{
  'update:date': [value: Date | null]
  'update:startDate': [value: Date | null]
  'update:endDate': [value: Date | null]
}>()

// Helper: Convert Date or timestamp to CalendarDate
function toCalendarDateValue(value: Date | number | null | undefined): DateValue | undefined {
  if (!value) return undefined
  const date = value instanceof Date ? value : new Date(value)
  // Convert Date -> ZonedDateTime -> CalendarDate
  const zonedDateTime = fromDate(date, getLocalTimeZone())
  return toCalendarDate(zonedDateTime)
}

// Helper: Convert CalendarDate to Date
function calendarDateToDate(date: DateValue | null | undefined): Date | null {
  if (!date) return null
  return date.toDate(getLocalTimeZone())
}

// Single date mode
const internalDate = computed({
  get: () => toCalendarDateValue(props.date),
  set: (value: DateValue | null | undefined) => {
    emit('update:date', calendarDateToDate(value))
  }
})

// Range mode
const internalRange = computed({
  get: (): DateRange | undefined => {
    const start = toCalendarDateValue(props.startDate)
    const end = toCalendarDateValue(props.endDate)

    if (!start && !end) return undefined

    return {
      start: start || undefined,
      end: end || undefined
    }
  },
  set: (value: DateRange | null | undefined) => {
    if (!value) {
      emit('update:startDate', null)
      emit('update:endDate', null)
      return
    }

    emit('update:startDate', calendarDateToDate(value.start))
    emit('update:endDate', calendarDateToDate(value.end))
  }
})

// Min/Max constraints
const minCalendarDate = computed(() => toCalendarDateValue(props.minDate))
const maxCalendarDate = computed(() => toCalendarDateValue(props.maxDate))

// Computed number of months (default to 2 for ranges, 1 for single)
const displayMonths = computed(() => {
  if (props.numberOfMonths) return props.numberOfMonths
  return props.range ? 2 : 1
})
</script>

<template>
  <UCalendar
    v-if="!range"
    v-model="internalDate"
    :color="color"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :min-value="minCalendarDate"
    :max-value="maxCalendarDate"
    :month-controls="monthControls"
    :year-controls="yearControls"
    :number-of-months="displayMonths"
  />

  <UCalendar
    v-else
    v-model="internalRange"
    range
    :color="color"
    :variant="variant"
    :size="size"
    :disabled="disabled"
    :min-value="minCalendarDate"
    :max-value="maxCalendarDate"
    :month-controls="monthControls"
    :year-controls="yearControls"
    :number-of-months="displayMonths"
  />
</template>
