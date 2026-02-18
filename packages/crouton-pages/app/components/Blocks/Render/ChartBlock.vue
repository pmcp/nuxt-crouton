<script setup lang="ts">
/**
 * Chart Block Public Renderer
 *
 * Renders a chart block in read-only mode using CroutonChartsWidget
 * (from @fyit/crouton-charts). Falls back to a UAlert placeholder
 * when crouton-charts is not installed.
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 * It is rendered via dynamic <component :is> inside BlockContent.vue
 * which has no <Suspense> boundary.
 */
import { resolveComponent } from 'vue'
import type { ChartBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: ChartBlockAttrs
}

const props = defineProps<Props>()

// Graceful degradation: resolveComponent returns a string if not found
const CroutonChartsWidget = resolveComponent('CroutonChartsWidget')
const chartAvailable = typeof CroutonChartsWidget !== 'string'

// Parse height (may come as string from select schema)
const height = computed(() => {
  const h = props.attrs.height
  if (typeof h === 'number') return h
  if (typeof h === 'string') return parseInt(h, 10) || 300
  return 300
})
</script>

<template>
  <div class="chart-block my-8">
    <!-- crouton-charts not installed -->
    <UAlert
      v-if="!chartAvailable"
      color="warning"
      icon="i-lucide-chart-bar"
      title="Charts not available"
      description="Add @fyit/crouton-charts to your app to enable chart blocks."
    />

    <!-- No collection selected -->
    <UAlert
      v-else-if="!attrs.collection"
      color="neutral"
      icon="i-lucide-chart-bar"
      title="No collection selected"
      description="Edit this block to select a collection."
    />

    <!-- Render chart widget -->
    <component
      :is="CroutonChartsWidget"
      v-else
      :collection="attrs.collection"
      :type="attrs.chartType || 'bar'"
      :x-field="attrs.xField"
      :y-fields="attrs.yFields"
      :title="attrs.title"
      :height="height"
      :stacked="attrs.stacked"
    />
  </div>
</template>
