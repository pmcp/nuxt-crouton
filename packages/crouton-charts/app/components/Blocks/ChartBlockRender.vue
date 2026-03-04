<script setup lang="ts">
/**
 * Chart Block Public Renderer
 *
 * Renders a chart block in read-only mode using CroutonChartsWidget.
 * Since this component lives in crouton-charts, no hasApp() check is needed.
 *
 * Supports two modes:
 * - 'collection' (default): uses the collection key + chart config from attrs
 * - 'preset': resolves a named preset from the chart registry and uses its config
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 */

import type { ChartBlockAttrs } from '../../utils/chart-constants'
import type { ChartPreset } from '../../composables/useCroutonChartRegistry'

interface Props {
  attrs: ChartBlockAttrs
}

const props = defineProps<Props>()

// Read chart presets from shared state (set by useCroutonChartRegistry in crouton-charts)
const chartPresets = useState<ChartPreset[]>('crouton-chart-presets', () => [])

// Resolve preset when mode === 'preset'
const resolvedPreset = computed(() => {
  if (props.attrs.mode !== 'preset' || !props.attrs.preset) return null
  return chartPresets.value.find(p => p.id === props.attrs.preset) || null
})

// Effective props to pass to CroutonChartsWidget
const effectiveProps = computed(() => {
  if (resolvedPreset.value) {
    const pc = resolvedPreset.value.config
    return {
      apiPath: pc.apiPath,
      collection: pc.collection,
      type: pc.type || 'bar',
      xField: pc.xField,
      yFields: pc.yFields,
      title: props.attrs.title || pc.title,
      height: height.value,
      stacked: pc.stacked ?? false
    }
  }
  return {
    collection: props.attrs.collection,
    type: props.attrs.chartType || 'bar',
    xField: props.attrs.xField,
    yFields: props.attrs.yFields,
    title: props.attrs.title,
    height: height.value,
    stacked: props.attrs.stacked ?? false
  }
})

// Parse height (may come as string from select schema)
const height = computed(() => {
  const h = props.attrs.height
  if (typeof h === 'number') return h
  if (typeof h === 'string') return parseInt(h, 10) || 300
  return 300
})

// Whether we have something to render
const hasSource = computed(() => {
  if (props.attrs.mode === 'preset') return !!resolvedPreset.value
  return !!props.attrs.collection
})
</script>

<template>
  <div class="chart-block">
    <!-- Preset mode: preset not selected or not found -->
    <UAlert
      v-if="attrs.mode === 'preset' && !resolvedPreset"
      color="neutral"
      icon="i-lucide-chart-bar"
      title="No preset selected"
      description="Edit this block to select a chart preset."
    />

    <!-- Collection mode: no collection selected -->
    <UAlert
      v-else-if="(!attrs.mode || attrs.mode === 'collection') && !attrs.collection"
      color="neutral"
      icon="i-lucide-chart-bar"
      title="No collection selected"
      description="Edit this block to select a collection."
    />

    <!-- Render chart widget -->
    <CroutonChartsWidget
      v-else-if="hasSource"
      v-bind="effectiveProps"
    />
  </div>
</template>
