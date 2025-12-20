<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { CalendarDate, today, getLocalTimeZone } from '@internationalized/date'
import { twMerge } from 'tailwind-merge'

// Types
interface WeekCalendarUI {
  root?: string
  header?: string
  monthLabel?: string
  weekBadge?: string
  carousel?: string
  carouselItem?: string
  grid?: string
  day?: string
  dayLabel?: string
  dayNumber?: string
  daySlot?: string
  arrows?: { prev?: string, next?: string }
}

interface Props {
  // Core functionality
  modelValue?: Date | null
  weekStartsOn?: 0 | 1
  initialWeeks?: number

  // Expansion behavior
  expandThreshold?: number
  expandCount?: number

  // Display options
  showArrows?: boolean
  showWeekNumber?: boolean
  showMonthLabel?: boolean
  weekdayFormat?: 'narrow' | 'short' | 'long'

  // Internationalization
  locale?: string

  // Nuxt UI theming
  color?: string
  size?: 'sm' | 'md' | 'lg'
  ui?: WeekCalendarUI
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  weekStartsOn: 1,
  initialWeeks: 12,
  expandThreshold: 3,
  expandCount: 4,
  showArrows: true,
  showWeekNumber: true,
  showMonthLabel: true,
  weekdayFormat: 'long',
  locale: undefined,
  color: 'primary',
  size: 'md',
  ui: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: Date | null]
  'weekChange': [weekStart: Date, weekEnd: Date]
  'dayHover': [date: Date | null]
  'dayClick': [date: Date]
}>()

// Template refs
const carousel = ref()

// Size configuration
const sizeConfig = {
  sm: {
    dayLabel: 'text-[10px]',
    dayNumber: 'text-base',
    daySlot: 'min-h-[16px]',
    gap: 'gap-0.5',
    padding: 'py-1',
    header: 'text-sm',
    badge: 'xs' as const
  },
  md: {
    dayLabel: 'text-xs',
    dayNumber: 'text-xl',
    daySlot: 'min-h-[20px]',
    gap: 'gap-1',
    padding: 'py-2',
    header: 'text-base',
    badge: 'sm' as const
  },
  lg: {
    dayLabel: 'text-sm',
    dayNumber: 'text-2xl',
    daySlot: 'min-h-[24px]',
    gap: 'gap-2',
    padding: 'py-3',
    header: 'text-lg',
    badge: 'md' as const
  }
}

// Computed UI classes with twMerge
const uiClasses = computed(() => {
  const size = sizeConfig[props.size]
  return {
    root: twMerge('flex flex-col gap-2', props.ui?.root),
    header: twMerge('flex items-center justify-center gap-2', props.ui?.header),
    monthLabel: twMerge(
      size.header,
      'font-medium hover:text-primary transition-colors cursor-pointer',
      props.ui?.monthLabel
    ),
    weekBadge: twMerge(props.ui?.weekBadge),
    carousel: twMerge(props.ui?.carousel),
    carouselItem: twMerge('basis-full', props.ui?.carouselItem),
    grid: twMerge('grid grid-cols-7', size.gap, props.ui?.grid),
    day: twMerge(
      'flex flex-col items-center cursor-pointer group',
      size.padding,
      props.ui?.day
    ),
    dayLabel: twMerge(
      size.dayLabel,
      'text-muted uppercase tracking-wider font-medium mb-1',
      props.ui?.dayLabel
    ),
    dayNumber: twMerge(
      size.dayNumber,
      'font-medium transition-colors mb-2',
      props.ui?.dayNumber
    ),
    daySlot: twMerge(size.daySlot, props.ui?.daySlot),
    arrows: {
      prev: twMerge('sm:-start-4', props.ui?.arrows?.prev),
      next: twMerge('sm:-end-4', props.ui?.arrows?.next)
    }
  }
})

// Carousel UI config
const carouselUi = computed(() => ({
  item: uiClasses.value.carouselItem,
  prev: uiClasses.value.arrows.prev,
  next: uiClasses.value.arrows.next
}))

// Track the range of week offsets we've generated (relative to today)
const earliestWeekOffset = ref(-Math.floor(props.initialWeeks / 2))
const latestWeekOffset = ref(Math.ceil(props.initialWeeks / 2) - 1)

// Week data structure - using CalendarDate for precise typing
interface DayData {
  date: CalendarDate
  day: number
  weekday: string
  jsDate: Date
}

interface WeekData {
  id: number
  weekStart: CalendarDate
  days: DayData[]
}

// Generate weeks dynamically
const weeks = ref<WeekData[]>([])

// Effective locale (browser default if not specified)
const effectiveLocale = computed(() => props.locale || undefined)

// Get the start of the week for a given date
function getWeekStart(date: CalendarDate): CalendarDate {
  const jsDate = date.toDate(getLocalTimeZone())
  const dayOfWeek = jsDate.getDay()
  const diff = props.weekStartsOn === 1
    ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
    : -dayOfWeek
  return date.add({ days: diff })
}

// Format weekday based on props
function formatWeekday(date: CalendarDate): string {
  return new Intl.DateTimeFormat(effectiveLocale.value, {
    weekday: props.weekdayFormat
  }).format(date.toDate(getLocalTimeZone()))
}

// Generate 7 days for a week
function generateWeekDays(weekStart: CalendarDate): DayData[] {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = weekStart.add({ days: i })
    days.push({
      date,
      day: date.day,
      weekday: formatWeekday(date),
      jsDate: date.toDate(getLocalTimeZone())
    })
  }
  return days
}

// Generate a week object for a given offset from today
function generateWeek(offset: number): WeekData {
  const todayDate = today(getLocalTimeZone())
  const weekStart = getWeekStart(todayDate.add({ weeks: offset }))
  return {
    id: offset,
    weekStart,
    days: generateWeekDays(weekStart)
  }
}

// Initialize weeks array
function initializeWeeks() {
  const result: WeekData[] = []
  for (let i = earliestWeekOffset.value; i <= latestWeekOffset.value; i++) {
    result.push(generateWeek(i))
  }
  weeks.value = result
}

// Add weeks to the past (beginning of array)
function addWeeksToPast(count: number = props.expandCount) {
  const newWeeks: WeekData[] = []
  for (let i = 0; i < count; i++) {
    earliestWeekOffset.value--
    newWeeks.unshift(generateWeek(earliestWeekOffset.value))
  }
  weeks.value = [...newWeeks, ...weeks.value]

  // Adjust carousel position to maintain current view
  nextTick(() => {
    const api = carousel.value?.emblaApi
    if (api) {
      const currentIndex = api.selectedScrollSnap()
      api.scrollTo(currentIndex + count, false)
    }
  })
}

// Add weeks to the future (end of array)
function addWeeksToFuture(count: number = props.expandCount) {
  const newWeeks: WeekData[] = []
  for (let i = 0; i < count; i++) {
    latestWeekOffset.value++
    newWeeks.push(generateWeek(latestWeekOffset.value))
  }
  weeks.value = [...weeks.value, ...newWeeks]
}

// Check if we need to expand and do so
function checkAndExpand(index: number) {
  // Near the beginning - add past weeks
  if (index < props.expandThreshold) {
    addWeeksToPast(props.expandCount)
  }

  // Near the end - add future weeks
  if (index > weeks.value.length - props.expandThreshold - 1) {
    addWeeksToFuture(props.expandCount)
  }
}

// Format month label with locale support
function getMonthLabel(weekStart: CalendarDate): string {
  const startDate = weekStart.toDate(getLocalTimeZone())
  const endDate = weekStart.add({ days: 6 }).toDate(getLocalTimeZone())

  const monthYear = new Intl.DateTimeFormat(effectiveLocale.value, {
    month: 'long',
    year: 'numeric'
  })

  if (weekStart.month === weekStart.add({ days: 6 }).month) {
    return monthYear.format(startDate)
  }

  const startMonth = new Intl.DateTimeFormat(effectiveLocale.value, {
    month: 'short'
  }).format(startDate)
  const endMonthYear = new Intl.DateTimeFormat(effectiveLocale.value, {
    month: 'short',
    year: 'numeric'
  }).format(endDate)
  return `${startMonth} - ${endMonthYear}`
}

// Selection
const selectedDate = computed(() => {
  if (!props.modelValue) return null
  const d = props.modelValue
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate())
})

function isSelected(day: DayData): boolean {
  if (!selectedDate.value) return false
  return day.date.compare(selectedDate.value) === 0
}

function isToday(day: DayData): boolean {
  const todayDate = today(getLocalTimeZone())
  return day.date.compare(todayDate) === 0
}

function selectDay(day: DayData) {
  emit('update:modelValue', day.jsDate)
  emit('dayClick', day.jsDate)
}

// Go to today's week
function goToToday() {
  const todayIndex = weeks.value.findIndex(w => w.id === 0)
  if (todayIndex !== -1) {
    carousel.value?.emblaApi?.scrollTo(todayIndex)
  }
}

// Calculate start index (week containing today)
const startIndex = computed(() => {
  const idx = weeks.value.findIndex(w => w.id === 0)
  return idx !== -1 ? idx : Math.floor(weeks.value.length / 2)
})

// Track current visible week index for the month label
const currentWeekIndex = ref(0)

// Get ISO week number from a date
function getWeekNumber(date: CalendarDate): number {
  const jsDate = date.toDate(getLocalTimeZone())
  const startOfYear = new Date(jsDate.getFullYear(), 0, 1)
  const days = Math.floor((jsDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

// Computed month label based on current visible week
const currentMonthLabel = computed(() => {
  const week = weeks.value[currentWeekIndex.value]
  if (!week) return ''
  return getMonthLabel(week.weekStart as CalendarDate)
})

// Computed week number
const currentWeekNumber = computed(() => {
  const week = weeks.value[currentWeekIndex.value]
  if (!week) return 0
  return getWeekNumber(week.weekStart as CalendarDate)
})

// Current week data for slots
const currentWeek = computed(() => weeks.value[currentWeekIndex.value])

// Handle carousel slide change
function onWeekSelect(index: number) {
  currentWeekIndex.value = index
  const week = weeks.value[index]
  if (week) {
    const weekStart = week.weekStart.toDate(getLocalTimeZone())
    const weekEnd = week.weekStart.add({ days: 6 }).toDate(getLocalTimeZone())
    emit('weekChange', weekStart, weekEnd)

    // Check if we need to expand
    checkAndExpand(index)
  }
}

// Initialize on mount
onMounted(() => {
  initializeWeeks()
  currentWeekIndex.value = startIndex.value
  nextTick(() => {
    onWeekSelect(startIndex.value)
  })
})

// Scroll to a specific date's week
function scrollToDate(date: Date) {
  const targetDate = new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const targetWeekStart = getWeekStart(targetDate)

  // Find the week index that contains this date
  let weekIndex = weeks.value.findIndex((week) => {
    return week.weekStart.compare(targetWeekStart) === 0
  })

  // If not found, we may need to expand
  if (weekIndex === -1) {
    const todayDate = today(getLocalTimeZone())
    const todayWeekStart = getWeekStart(todayDate)

    // Calculate week difference
    const diffMs = targetWeekStart.toDate(getLocalTimeZone()).getTime() - todayWeekStart.toDate(getLocalTimeZone()).getTime()
    const weeksDiff = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000))

    // Expand in the appropriate direction
    if (weeksDiff < earliestWeekOffset.value) {
      const weeksToAdd = earliestWeekOffset.value - weeksDiff + props.expandCount
      addWeeksToPast(weeksToAdd)
    } else if (weeksDiff > latestWeekOffset.value) {
      const weeksToAdd = weeksDiff - latestWeekOffset.value + props.expandCount
      addWeeksToFuture(weeksToAdd)
    }

    // Try finding again
    weekIndex = weeks.value.findIndex((week) => {
      return week.weekStart.compare(targetWeekStart) === 0
    })
  }

  if (weekIndex !== -1) {
    carousel.value?.emblaApi?.scrollTo(weekIndex)
  }
}

// Type helper for template (Vue can't infer types from slot props)
function asDay(day: unknown): DayData {
  return day as DayData
}

// Get day classes with color support
function getDayNumberClass(day: DayData): string {
  const selected = isSelected(day)
  const todayDay = isToday(day)

  if (selected || todayDay) {
    return twMerge(uiClasses.value.dayNumber, `text-${props.color}`)
  }
  return twMerge(uiClasses.value.dayNumber, 'text-default group-hover:text-primary')
}

// Expose methods for parent
defineExpose({
  scrollToDate,
  goToToday
})
</script>

<template>
  <div :class="uiClasses.root">
    <!-- Header slot with default -->
    <slot
      name="header"
      :month-label="currentMonthLabel"
      :week-number="currentWeekNumber"
      :go-to-today="goToToday"
    >
      <div
        v-if="showMonthLabel"
        :class="uiClasses.header"
      >
        <button
          type="button"
          :class="uiClasses.monthLabel"
          @click="goToToday"
        >
          {{ currentMonthLabel }}
        </button>
        <slot
          name="week-badge"
          :week-number="currentWeekNumber"
        >
          <UBadge
            v-if="showWeekNumber"
            color="neutral"
            variant="subtle"
            :size="sizeConfig[size].badge"
            :class="uiClasses.weekBadge"
          >
            W{{ currentWeekNumber }}
          </UBadge>
        </slot>
      </div>
    </slot>

    <!-- Carousel -->
    <UCarousel
      ref="carousel"
      v-slot="{ item: week }"
      :arrows="showArrows"
      :items="weeks"
      :start-index="startIndex"
      :ui="carouselUi"
      :class="uiClasses.carousel"
      @select="onWeekSelect"
    >
      <div class="px-2">
        <!-- Days Grid -->
        <div :class="uiClasses.grid">
          <div
            v-for="day in (week as WeekData)?.days || []"
            :key="day.date.toString()"
            :class="uiClasses.day"
            @click="selectDay(asDay(day))"
            @mouseenter="emit('dayHover', day.jsDate)"
            @mouseleave="emit('dayHover', null)"
          >
            <!-- Weekday label -->
            <span :class="uiClasses.dayLabel">
              {{ day.weekday }}
            </span>

            <!-- Day number -->
            <span :class="getDayNumberClass(asDay(day))">
              {{ day.day }}
            </span>

            <!-- Slot for indicators -->
            <div :class="uiClasses.daySlot">
              <slot
                name="day"
                :date="day.date"
                :js-date="day.jsDate"
                :is-today="isToday(asDay(day))"
                :is-selected="isSelected(asDay(day))"
              />
            </div>
          </div>
        </div>
      </div>
    </UCarousel>
  </div>
</template>
