<script setup lang="ts">
/**
 * Product × Day Matrix Block Renderer
 *
 * Pivot table: rows = products, columns = days, last column = Total, with an
 * interactive Units ⇄ Revenue toggle. Data from the product-day-matrix
 * endpoint (team-members only). Pure UTable — no charts dependency — so it
 * renders safely in the editor preview too.
 *
 * BlockContent.vue wraps this in <ClientOnly> (clientOnly: true in block def).
 */
import type { TableColumn } from '@nuxt/ui'

interface MatrixProduct {
  product: string
  units: Record<string, number>
  revenue: Record<string, number>
  totalUnits: number
  totalRevenue: number
}
interface Matrix {
  days: string[]
  products: MatrixProduct[]
  dayTotals: Record<string, { units: number, revenue: number }>
  grandTotal: { units: number, revenue: number }
}

interface SalesProductMatrixAttrs {
  eventScope?: string
  measure?: 'units' | 'revenue'
  title?: string
}

const props = defineProps<{ attrs: SalesProductMatrixAttrs }>()

const { teamId } = useTeamContext()

const measure = ref<'units' | 'revenue'>(props.attrs.measure === 'revenue' ? 'revenue' : 'units')

const matrix = ref<Matrix | null>(null)
const pending = ref(true)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    matrix.value = await $fetch<Matrix>(
      `/api/crouton-sales/teams/${toValue(teamId)}/charts/product-day-matrix`,
      { query: props.attrs.eventScope ? { eventId: props.attrs.eventScope } : {} }
    )
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || 'Failed to load table data'
  } finally {
    pending.value = false
  }
}

onMounted(load)
watch(() => props.attrs.eventScope, load)

function fmt(n: number) {
  return measure.value === 'revenue' ? n.toFixed(2) : String(Math.round(n))
}
// '2026-05-20' → '05-20'
function shortDay(d: string) {
  return d.slice(5)
}

const columns = computed<TableColumn<Record<string, unknown>>[]>(() => {
  if (!matrix.value) return []
  return [
    { accessorKey: 'product', header: 'Product' },
    ...matrix.value.days.map(d => ({ accessorKey: d, header: shortDay(d) })),
    { accessorKey: '__total', header: 'Total' }
  ]
})

const rows = computed<Record<string, unknown>[]>(() => {
  const m = matrix.value
  if (!m) return []
  const key = measure.value

  const data = m.products.map((p) => {
    const row: Record<string, unknown> = { product: p.product }
    for (const d of m.days) row[d] = fmt((key === 'units' ? p.units : p.revenue)[d] ?? 0)
    row.__total = fmt(key === 'units' ? p.totalUnits : p.totalRevenue)
    return row
  })

  // Column-totals row
  const totalRow: Record<string, unknown> = { product: 'Total' }
  for (const d of m.days) totalRow[d] = fmt(m.dayTotals[d]?.[key] ?? 0)
  totalRow.__total = fmt(m.grandTotal[key])
  data.push(totalRow)

  return data
})

const hasData = computed(() => (matrix.value?.products.length ?? 0) > 0)

// Escape a CSV cell (quote when it contains a comma, quote or newline).
function csvCell(v: string | number) {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Download the table (current measure) as a spreadsheet-friendly CSV.
function downloadCsv() {
  const m = matrix.value
  if (!m) return
  const key = measure.value

  const lines: (string | number)[][] = [['Product', ...m.days, 'Total']]
  for (const p of m.products) {
    lines.push([
      p.product,
      ...m.days.map(d => fmt((key === 'units' ? p.units : p.revenue)[d] ?? 0)),
      fmt(key === 'units' ? p.totalUnits : p.totalRevenue)
    ])
  }
  lines.push([
    'Total',
    ...m.days.map(d => fmt(m.dayTotals[d]?.[key] ?? 0)),
    fmt(m.grandTotal[key])
  ])

  // Prepend a UTF-8 BOM so Excel reads accented product names correctly.
  const csv = '﻿' + lines.map(r => r.map(csvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sales-${key}-by-product-and-day.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="sales-product-matrix space-y-3">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <h3 v-if="attrs.title" class="text-lg font-semibold">{{ attrs.title }}</h3>
      <div class="flex items-center gap-2 ml-auto">
        <UButtonGroup size="sm">
          <UButton
            :color="measure === 'units' ? 'primary' : 'neutral'"
            :variant="measure === 'units' ? 'solid' : 'outline'"
            icon="i-lucide-hash"
            @click="measure = 'units'"
          >
            Units
          </UButton>
          <UButton
            :color="measure === 'revenue' ? 'primary' : 'neutral'"
            :variant="measure === 'revenue' ? 'solid' : 'outline'"
            icon="i-lucide-banknote"
            @click="measure = 'revenue'"
          >
            Revenue
          </UButton>
        </UButtonGroup>
        <UButton
          size="sm"
          color="neutral"
          variant="outline"
          icon="i-lucide-download"
          :disabled="!hasData"
          @click="downloadCsv"
        >
          CSV
        </UButton>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      :title="error"
    />

    <div
      v-else-if="!pending && !hasData"
      class="flex flex-col items-center justify-center rounded-lg border border-dashed border-default text-muted py-10"
    >
      <UIcon name="i-lucide-table" class="size-8 mb-2 opacity-30" />
      <p class="text-sm">No sales data yet</p>
    </div>

    <div v-else class="overflow-x-auto">
      <UTable
        :loading="pending"
        :data="rows"
        :columns="columns"
        :ui="{ td: 'tabular-nums', tr: 'last:font-semibold last:bg-muted/30' }"
      />
    </div>
  </div>
</template>
