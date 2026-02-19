<script setup lang="ts">
/**
 * CroutonChartsWidget
 *
 * Collection-driven chart component. Fetches collection data via useCollectionChart
 * and renders it using nuxt-charts (BarChart, LineChart, AreaChart, DonutChart).
 *
 * Auto-detects numeric fields when yFields is not provided.
 */
import { computed } from 'vue'

interface Props {
  /** Collection key (e.g. 'blogPosts', 'products') */
  collection?: string
  /** Direct API path override. Supports {teamId} placeholder. Takes priority over collection. */
  apiPath?: string
  /** Chart type to render */
  type?: 'bar' | 'line' | 'area' | 'donut'
  /** Field to use as X axis. Auto-resolved from collection display.title if not set. */
  xField?: string
  /** Comma-separated field names for Y axis values. Auto-detected if not set. */
  yFields?: string
  /** Optional title above the chart */
  title?: string
  /** Chart height in pixels */
  height?: number
  /** Stack series (bar/area charts) */
  stacked?: boolean
  /** Chart orientation */
  orientation?: 'vertical' | 'horizontal'
}

const props = withDefaults(defineProps<Props>(), {
  collection: '',
  type: 'bar',
  height: 300,
  stacked: false,
  orientation: 'vertical'
})

// Parse comma-separated yFields string into array
const yFieldsArray = computed(() => {
  if (!props.yFields) return undefined
  return props.yFields.split(',').map(f => f.trim()).filter(Boolean)
})

const { chartData, categories, pending, error } = useCollectionChart(
  computed(() => props.collection || ''),
  computed(() => ({
    xField: props.xField,
    yFields: yFieldsArray.value,
    apiPath: props.apiPath,
    limit: 100
  }))
)

const hasData = computed(() => chartData.value.length > 0)

// xAxis key derived from the first data point's non-category keys
const xAxisKey = computed(() => {
  if (!hasData.value) return 'name'
  const categoryNames = categories.value.map(c => c.name)
  const keys = Object.keys(chartData.value[0] || {})
  return keys.find(k => !categoryNames.includes(k)) || 'name'
})
</script>

<template>
  <div class="crouton-charts-widget">
    <!-- Title -->
    <h3 v-if="title" class="text-lg font-semibold mb-3">
      {{ title }}
    </h3>

    <!-- Loading state -->
    <div v-if="pending" class="space-y-2">
      <USkeleton class="h-4 w-1/3" />
      <USkeleton :style="{ height: `${height}px` }" class="w-full rounded-lg" />
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      title="Failed to load chart data"
      :description="String(error)"
    />

    <!-- Empty state -->
    <div
      v-else-if="!hasData"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-muted"
      :style="{ height: `${height}px` }"
    >
      <UIcon name="i-lucide-chart-bar" class="size-10 mb-2 opacity-30" />
      <p class="text-sm">No data available</p>
    </div>

    <!-- Donut chart -->
    <DonutChart
      v-else-if="type === 'donut'"
      :data="chartData"
      :category="categories[0]?.name || ''"
      :index="xAxisKey"
      :colors="categories.map(c => c.color)"
      :height="height"
    />

    <!-- Bar chart -->
    <BarChart
      v-else-if="type === 'bar'"
      :data="chartData"
      :categories="categories.map(c => c.name)"
      :index="xAxisKey"
      :colors="categories.map(c => c.color)"
      :height="height"
      :stacked="stacked"
    />

    <!-- Line chart -->
    <LineChart
      v-else-if="type === 'line'"
      :data="chartData"
      :categories="categories.map(c => c.name)"
      :index="xAxisKey"
      :colors="categories.map(c => c.color)"
      :height="height"
    />

    <!-- Area chart -->
    <AreaChart
      v-else-if="type === 'area'"
      :data="chartData"
      :categories="categories.map(c => c.name)"
      :index="xAxisKey"
      :colors="categories.map(c => c.color)"
      :height="height"
      :stacked="stacked"
    />
  </div>
</template>
