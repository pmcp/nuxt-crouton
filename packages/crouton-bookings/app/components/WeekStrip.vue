<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'

interface Props {
  modelValue?: Date | null
  weekStartsOn?: 0 | 1 // 0 = Sunday, 1 = Monday
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'beams' | 'bars'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  weekStartsOn: 1, // Monday default
  size: 'md',
  variant: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: Date | null]
}>()

// Current week's reference date (for navigation)
const referenceDate = ref(today(getLocalTimeZone()))

// Compute the start of the week
const weekStart = computed(() => {
  const dayOfWeek = referenceDate.value.toDate(getLocalTimeZone()).getDay()
  const diff = props.weekStartsOn === 1
    ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) // Monday start
    : -dayOfWeek // Sunday start
  return referenceDate.value.add({ days: diff })
})

// Generate array of 7 days
const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = weekStart.value.add({ days: i })
    days.push({
      date,
      day: date.day,
      weekday: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date.toDate(getLocalTimeZone())),
      weekdayShort: new Intl.DateTimeFormat('en', { weekday: 'narrow' }).format(date.toDate(getLocalTimeZone())),
      jsDate: date.toDate(getLocalTimeZone()),
    })
  }
  return days
})

// Format week label for header (like "December 2025")
const weekLabel = computed(() => {
  const start = weekStart.value
  const end = start.add({ days: 6 })
  const startDate = start.toDate(getLocalTimeZone())
  const endDate = end.toDate(getLocalTimeZone())

  const monthYear = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })

  // If same month, show "December 2025"
  if (start.month === end.month) {
    return monthYear.format(startDate)
  }
  // If different months, show "Dec - Jan 2025" or "Dec 2024 - Jan 2025"
  const startMonth = new Intl.DateTimeFormat('en', { month: 'short' }).format(startDate)
  const endMonthYear = new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(endDate)
  return `${startMonth} - ${endMonthYear}`
})

// Navigation
function prevWeek() {
  referenceDate.value = referenceDate.value.subtract({ weeks: 1 })
}

function nextWeek() {
  referenceDate.value = referenceDate.value.add({ weeks: 1 })
}

function goToToday() {
  referenceDate.value = today(getLocalTimeZone())
}

// Selection
const selectedDate = computed(() => {
  if (!props.modelValue) return null
  const d = props.modelValue
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
})

function isSelected(day: { date: DateValue }): boolean {
  if (!selectedDate.value) return false
  return day.date.compare(selectedDate.value) === 0
}

function isToday(day: { date: DateValue }): boolean {
  const todayDate = today(getLocalTimeZone())
  return day.date.compare(todayDate) === 0
}

function selectDay(day: { date: DateValue, jsDate: Date }) {
  emit('update:modelValue', day.jsDate)
}

// Size classes
const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        header: 'text-sm',
        weekday: 'text-xs',
        day: 'text-lg',
        cell: 'py-2',
      }
    case 'md':
      return {
        header: 'text-base',
        weekday: 'text-xs',
        day: 'text-xl',
        cell: 'py-3',
      }
    case 'lg':
    default:
      return {
        header: 'text-lg',
        weekday: 'text-sm',
        day: 'text-2xl',
        cell: 'py-4',
      }
  }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- Header: Nav + Month Label (calendar style) -->
    <div class="flex items-center justify-between">
      <div class="flex items-center">
        <UButton
          icon="i-lucide-chevrons-left"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="prevWeek"
        />
      </div>
      <button
        type="button"
        class="font-medium hover:text-primary transition-colors"
        :class="sizeClasses.header"
        @click="goToToday"
      >
        {{ weekLabel }}
      </button>
      <div class="flex items-center">
        <UButton
          icon="i-lucide-chevrons-right"
          variant="ghost"
          color="neutral"
          size="sm"
          @click="nextWeek"
        />
      </div>
    </div>

    <!-- Days Grid -->
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="day in weekDays"
        :key="day.date.toString()"
        class="flex flex-col items-center cursor-pointer group"
        :class="sizeClasses.cell"
        @click="selectDay(day)"
      >
        <!-- Weekday label -->
        <span :class="['text-muted uppercase tracking-wider font-medium', sizeClasses.weekday]">
          {{ day.weekdayShort }}
        </span>

        <!-- Day number -->
        <span
          :class="[
            'font-medium transition-colors',
            sizeClasses.day,
            isSelected(day)
              ? 'text-primary'
              : isToday(day)
                ? 'text-primary'
                : 'text-default group-hover:text-primary',
          ]"
        >
          {{ day.day }}
        </span>

        <!-- Slot for indicators -->
        <div class="mt-1 min-h-[8px]">
          <slot name="day" :day="day.date" :js-date="day.jsDate" />
        </div>
      </div>
    </div>
  </div>
</template>
