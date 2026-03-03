import type { ChartPresetConfig } from '../composables/useCroutonChartRegistry'

/** Shared color palette for all chart types */
export const CHART_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
] as const

/** Block attrs for chart editor blocks (used by both View and Render) */
export interface ChartBlockAttrs {
  mode?: 'collection' | 'preset'
  preset?: string
  collection: string
  chartType: string
  xField?: string
  yFields?: string
  title?: string
  height?: number | string
  stacked?: boolean
}
