<script setup lang="ts">
/**
 * StatsCard Component
 *
 * Displays a single statistic with optional trend indicator.
 * Used in the admin dashboard for key metrics.
 */
import { computed } from 'vue'

interface Props {
  /** The stat value to display */
  value: number | string
  /** Label describing the stat */
  label: string
  /** Icon name from Heroicons (e.g., 'i-heroicons-users') */
  icon?: string
  /** Trend value (+5, -3, etc.) */
  trend?: number
  /** Color theme: primary, success, warning, error */
  color?: 'primary' | 'success' | 'warning' | 'error'
  /** Whether the stat is currently loading */
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'i-heroicons-chart-bar',
  color: 'primary',
  loading: false
})

const colorClasses = computed(() => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400',
    success: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
    warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    error: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
  }
  return colors[props.color]
})

const trendColorClass = computed(() => {
  if (!props.trend) return ''
  return props.trend > 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
})

const trendIcon = computed(() => {
  if (!props.trend) return null
  return props.trend > 0
    ? 'i-heroicons-arrow-trending-up'
    : 'i-heroicons-arrow-trending-down'
})
</script>

<template>
  <div class="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-between">
      <div class="flex-1">
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ label }}
        </p>
        <div class="mt-2 flex items-baseline gap-2">
          <template v-if="loading">
            <div class="h-8 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </template>
          <template v-else>
            <p class="text-3xl font-semibold text-gray-900 dark:text-white">
              {{ value }}
            </p>
            <span
              v-if="trend !== undefined && trend !== 0"
              class="inline-flex items-center gap-0.5 text-sm font-medium"
              :class="trendColorClass"
            >
              <UIcon
                v-if="trendIcon"
                :name="trendIcon"
                class="size-4"
              />
              {{ trend > 0 ? `+${trend}` : trend }}
            </span>
          </template>
        </div>
      </div>
      <div
        class="flex size-12 shrink-0 items-center justify-center rounded-lg"
        :class="colorClasses"
      >
        <UIcon
          :name="icon"
          class="size-6"
        />
      </div>
    </div>
  </div>
</template>
