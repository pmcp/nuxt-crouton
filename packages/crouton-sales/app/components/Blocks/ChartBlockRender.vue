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
 * Editor preview: the block property panel renders this component inside a
 * scaled, rapidly re-rendering live-preview pane. The underlying chart lib
 * (vue-chrts) can't survive being patched/unmounted there (null __vnode /
 * parentNode crashes on every panel interaction and on save), so in the admin
 * editor we render a static placeholder and only mount the real chart on the
 * public page, where it mounts once and is stable.
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

const { t } = useT()
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

// In the admin editor (incl. the property panel's live preview) render a
// static placeholder rather than the live chart — see header comment.
const route = useRoute()
const isEditorPreview = computed(() => route.path.startsWith('/admin'))
</script>

<template>
  <div class="sales-chart-block">
    <!-- No chart selected -->
    <UAlert
      v-if="!kind"
      color="neutral"
      icon="i-lucide-chart-bar"
      :title="t('sales.block.noChartSelected')"
      :description="t('sales.block.editToPickChart')"
    />

    <!-- Charts package not installed -->
    <UAlert
      v-else-if="!hasCharts"
      color="warning"
      icon="i-lucide-chart-bar"
      :title="t('sales.block.chartsRequired')"
      :description="t('sales.block.installCharts')"
    />

    <!-- Editor/preview: static placeholder (live chart would crash in the
         scaled, re-rendering property-panel preview) -->
    <div
      v-else-if="isEditorPreview"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default text-muted gap-3"
      :style="{ height: `${height}px` }"
    >
      <div class="flex items-end gap-1.5 h-16">
        <div class="w-3 rounded-sm bg-primary/30" style="height: 60%" />
        <div class="w-3 rounded-sm bg-primary/40" style="height: 90%" />
        <div class="w-3 rounded-sm bg-primary/30" style="height: 45%" />
        <div class="w-3 rounded-sm bg-primary/50" style="height: 100%" />
        <div class="w-3 rounded-sm bg-primary/35" style="height: 70%" />
      </div>
      <p class="text-sm font-medium">{{ props.attrs.title || kind.title }}</p>
      <p class="text-xs">{{ t('sales.block.chartRendersOnPage') }}</p>
    </div>

    <!-- Public page: the live charts widget -->
    <CroutonChartsWidget
      v-else
      :api-path="kind.apiPath"
      :type="chartType"
      :x-field="kind.xField"
      :y-fields="kind.yFields"
      :title="props.attrs.title || kind.title"
      :height="height"
      :stacked="kind.stacked ?? false"
      :query="chartQuery"
    />
  </div>
</template>
