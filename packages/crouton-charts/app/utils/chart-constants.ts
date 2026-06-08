import type { ChartPresetConfig } from '../composables/useCroutonChartRegistry'

/** Shared color palette for all chart types (10 visually distinct hues) */
export const CHART_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
] as const

/**
 * Color for series `index` of `total` series — guaranteed never to repeat.
 *
 * Uses the curated palette while it has enough distinct entries; once there
 * are more series than palette colors, switches to evenly-spaced HSL hues so
 * no two series ever share a color (e.g. 12 products → 12 distinct hues).
 */
export function getChartColor(index: number, total: number): string {
  if (total <= CHART_COLOR_PALETTE.length) {
    return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length]!
  }
  const hue = Math.round((index * 360) / total)
  return `hsl(${hue} 65% 55%)`
}

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
