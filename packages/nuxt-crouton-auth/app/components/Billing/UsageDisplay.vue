<script setup lang="ts">
/**
 * Usage Display Component
 *
 * Displays usage metrics and limits for the current subscription.
 * Shows progress bars and warnings when approaching limits.
 *
 * @example
 * ```vue
 * <BillingUsageDisplay
 *   :metrics="[
 *     { name: 'API Calls', current: 8500, limit: 10000, unit: 'calls' },
 *     { name: 'Storage', current: 4.2, limit: 5, unit: 'GB' },
 *   ]"
 * />
 * ```
 */
interface UsageMetric {
  /** Metric name */
  name: string
  /** Current usage value */
  current: number
  /** Usage limit (null for unlimited) */
  limit: number | null
  /** Unit label (e.g., 'calls', 'GB', 'users') */
  unit: string
  /** Icon name */
  icon?: string
}

interface Props {
  /** Usage metrics to display */
  metrics: UsageMetric[]
  /** Show as compact inline display */
  compact?: boolean
  /** Warning threshold percentage (0-100) */
  warningThreshold?: number
  /** Danger threshold percentage (0-100) */
  dangerThreshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
  warningThreshold: 75,
  dangerThreshold: 90,
})

// Calculate percentage for a metric
const getPercentage = (metric: UsageMetric): number => {
  if (metric.limit === null || metric.limit === 0) return 0
  return Math.min(100, (metric.current / metric.limit) * 100)
}

// Get color based on usage percentage
const getColor = (metric: UsageMetric): 'success' | 'warning' | 'error' | 'primary' => {
  const pct = getPercentage(metric)
  if (pct >= props.dangerThreshold) return 'error'
  if (pct >= props.warningThreshold) return 'warning'
  return 'primary'
}

// Format value for display
const formatValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}

// Get limit display
const getLimitDisplay = (metric: UsageMetric): string => {
  if (metric.limit === null) return 'Unlimited'
  return formatValue(metric.limit)
}
</script>

<template>
  <!-- Compact Display -->
  <div v-if="compact" class="flex flex-wrap gap-4">
    <div
      v-for="metric in metrics"
      :key="metric.name"
      class="flex items-center gap-2 text-sm"
    >
      <UIcon
        v-if="metric.icon"
        :name="metric.icon"
        class="size-4 text-muted"
      />
      <span class="text-muted">{{ metric.name }}:</span>
      <span class="font-medium">
        {{ formatValue(metric.current) }}
        <span v-if="metric.limit" class="text-muted">
          / {{ getLimitDisplay(metric) }}
        </span>
        {{ metric.unit }}
      </span>
      <UBadge
        v-if="getPercentage(metric) >= dangerThreshold"
        color="error"
        size="xs"
      >
        Limit reached
      </UBadge>
    </div>
  </div>

  <!-- Full Display -->
  <div v-else class="space-y-4">
    <div
      v-for="metric in metrics"
      :key="metric.name"
      class="space-y-2"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            v-if="metric.icon"
            :name="metric.icon"
            class="size-4 text-muted"
          />
          <span class="text-sm font-medium">{{ metric.name }}</span>
        </div>
        <span class="text-sm text-muted">
          {{ formatValue(metric.current) }}
          <template v-if="metric.limit">
            / {{ getLimitDisplay(metric) }} {{ metric.unit }}
          </template>
          <template v-else>
            {{ metric.unit }} (Unlimited)
          </template>
        </span>
      </div>

      <!-- Progress Bar (only if there's a limit) -->
      <UProgress
        v-if="metric.limit"
        :model-value="getPercentage(metric)"
        :color="getColor(metric)"
        size="sm"
      />

      <!-- Warning/Danger Message -->
      <p
        v-if="getPercentage(metric) >= dangerThreshold"
        class="text-xs text-error"
      >
        You've reached {{ Math.round(getPercentage(metric)) }}% of your limit.
        Consider upgrading your plan.
      </p>
      <p
        v-else-if="getPercentage(metric) >= warningThreshold"
        class="text-xs text-warning"
      >
        You're approaching your limit ({{ Math.round(getPercentage(metric)) }}%).
      </p>
    </div>

    <!-- Empty State -->
    <div
      v-if="metrics.length === 0"
      class="text-center py-6 text-muted"
    >
      <UIcon name="i-lucide-bar-chart-3" class="size-8 mx-auto mb-2 opacity-50" />
      <p class="text-sm">No usage data available</p>
    </div>
  </div>
</template>
