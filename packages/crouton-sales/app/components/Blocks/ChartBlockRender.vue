<script setup lang="ts">
/**
 * Sales Chart Block Public Renderer
 *
 * Renders a sales analytics chart on a CMS page. Resolves the chosen chart
 * kind to an aggregation endpoint and delegates rendering to
 * CroutonChartsWidget — but only when @fyit/crouton-charts is installed.
 *
 * Optionality: when charts isn't installed, hasApp('charts') is false and we
 * show a notice instead of referencing the (absent) CroutonChartsWidget, so
 * nothing breaks. Event scope is forwarded as a ?eventId= query param.
 *
 * BlockContent.vue wraps this in <ClientOnly> (clientOnly: true in block def).
 */
import { SALES_CHART_KINDS } from '../../utils/chart-blocks'

interface SalesChartBlockAttrs {
  chart?: string
  eventScope?: string
  chartTypeOverride?: string
  title?: string
  height?: number | string
}

interface Props {
  attrs: SalesChartBlockAttrs
}

const props = defineProps<Props>()

const { hasApp } = useCroutonApps()
const hasCharts = computed(() => hasApp('charts'))

const kind = computed(() => (props.attrs.chart ? SALES_CHART_KINDS[props.attrs.chart] : undefined))

const height = computed(() => {
  const h = props.attrs.height
  if (typeof h === 'number') return h
  if (typeof h === 'string') return parseInt(h, 10) || 300
  return 300
})

type ChartType = 'bar' | 'line' | 'area' | 'donut'
const chartType = computed<ChartType>(() => {
  const override = props.attrs.chartTypeOverride
  if (override === 'bar' || override === 'line' || override === 'area' || override === 'donut') {
    return override
  }
  return kind.value?.type || 'bar'
})

// Forward the event scope to the aggregation endpoint; '' ⇒ team-wide (omitted).
const chartQuery = computed(() =>
  props.attrs.eventScope ? { eventId: props.attrs.eventScope } : undefined
)
</script>

<template>
  <div class="sales-chart-block">
    <!-- No chart selected -->
    <UAlert
      v-if="!kind"
      color="neutral"
      icon="i-lucide-chart-bar"
      title="No chart selected"
      description="Edit this block to pick a sales chart."
    />

    <!-- Charts package not installed -->
    <UAlert
      v-else-if="!hasCharts"
      color="warning"
      icon="i-lucide-chart-bar"
      title="Charts package required"
      description="Install @fyit/crouton-charts to render this chart."
    />

    <!-- Render via the charts widget -->
    <CroutonChartsWidget
      v-else
      :api-path="kind.apiPath"
      :type="chartType"
      :x-field="kind.xField"
      :y-fields="kind.yFields"
      :title="props.attrs.title || kind.title"
      :height="height"
      :query="chartQuery"
    />
  </div>
</template>
