/**
 * Sales Chart Kinds
 *
 * Static catalogue of the analytics charts the salesChartBlock can render.
 * Each kind maps to an aggregation endpoint under
 * /api/crouton-sales/teams/{teamId}/charts/* — the {teamId} placeholder is
 * interpolated by crouton-charts' useCollectionChart. Per-event scoping is
 * passed separately as a ?eventId= query param (see ChartBlockRender).
 *
 * Shared by the editor view (SalesBlocksChartBlockView), the public renderer
 * (SalesBlocksChartBlockRender), and the block schema options in app.config.ts.
 */

export interface SalesChartKind {
  id: string
  label: string
  /** API path with {teamId} placeholder; interpolated by useCollectionChart. */
  apiPath: string
  type: 'bar' | 'line' | 'area' | 'donut'
  xField: string
  yFields: string
  /** Default heading; overridable per block. */
  title: string
  icon: string
  /** Stack series (bar/area) — used by multi-series charts like per-product-per-day. */
  stacked?: boolean
}

function path(slug: string) {
  return `/api/crouton-sales/teams/{teamId}/charts/${slug}`
}

export const SALES_CHART_KINDS: Record<string, SalesChartKind> = {
  'revenue-by-day': {
    id: 'revenue-by-day',
    label: 'Revenue by day',
    apiPath: path('revenue-by-day'),
    type: 'area',
    xField: 'date',
    yFields: 'revenue',
    title: 'Revenue over time',
    icon: 'i-lucide-chart-area'
  },
  'revenue-by-product': {
    id: 'revenue-by-product',
    label: 'Revenue by product',
    apiPath: path('revenue-by-product'),
    type: 'bar',
    xField: 'product',
    yFields: 'revenue',
    title: 'Revenue by product',
    icon: 'i-lucide-chart-bar'
  },
  'revenue-by-category': {
    id: 'revenue-by-category',
    label: 'Revenue by category',
    apiPath: path('revenue-by-category'),
    type: 'bar',
    xField: 'category',
    yFields: 'revenue',
    title: 'Revenue by category',
    icon: 'i-lucide-chart-bar'
  },
  'units-per-product-day': {
    id: 'units-per-product-day',
    label: 'Units per product per day',
    apiPath: path('units-per-product-day'),
    // Stacked bar: one bar per day, products stacked by colour — reads as
    // "daily volume + product mix" without the grouped-bar clutter.
    type: 'bar',
    stacked: true,
    xField: 'date',
    // Empty → the widget auto-detects every product column as its own series.
    yFields: '',
    title: 'Units sold per product per day',
    icon: 'i-lucide-chart-bar-stacked'
  },
  'top-products': {
    id: 'top-products',
    label: 'Top products (by quantity)',
    apiPath: path('top-products'),
    type: 'bar',
    xField: 'product',
    yFields: 'quantity',
    title: 'Top products',
    icon: 'i-lucide-trophy'
  },
  'orders-by-status': {
    id: 'orders-by-status',
    label: 'Orders by status',
    apiPath: path('orders-by-status'),
    type: 'donut',
    xField: 'status',
    yFields: 'count',
    title: 'Orders by status',
    icon: 'i-lucide-chart-pie'
  },
  'sales-by-location': {
    id: 'sales-by-location',
    label: 'Sales by location',
    apiPath: path('sales-by-location'),
    type: 'bar',
    xField: 'location',
    yFields: 'revenue',
    title: 'Sales by location',
    icon: 'i-lucide-map-pin'
  }
}

/** Select options for the block schema's `chart` field. */
export const SALES_CHART_KIND_OPTIONS = Object.values(SALES_CHART_KINDS).map(k => ({
  label: k.label,
  value: k.id
}))
