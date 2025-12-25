import { ref } from 'vue'
import type { Ref } from 'vue'

/**
 * Field configuration for export
 */
export interface ExportField {
  /** Field key in the data */
  key: string
  /** Header label for export (defaults to key) */
  label?: string
  /** Transform value before export */
  transform?: (value: any, row: any) => any
}

/**
 * Options for collection export
 */
export interface ExportOptions {
  /** Specific fields to include (default: all) */
  fields?: (string | ExportField)[]

  /** Fields to exclude from export */
  excludeFields?: string[]

  /** Custom filename (without extension) */
  filename?: string

  /** Include metadata fields (createdAt, updatedAt, etc.) */
  includeMetadata?: boolean

  /** Include ID field */
  includeId?: boolean

  /** Transform each row before export */
  transformRow?: (row: any) => any

  /** Date format for date fields */
  dateFormat?: 'iso' | 'locale' | 'timestamp'

  /** How to handle nested objects/arrays in CSV */
  flattenNested?: boolean
}

/**
 * Return type for useCollectionExport
 */
export interface UseCollectionExportReturn {
  /** Export provided rows to CSV */
  exportCSV: (rows: any[], options?: ExportOptions) => void

  /** Export provided rows to JSON */
  exportJSON: (rows: any[], options?: ExportOptions) => void

  /** Export with fetch (for server-side filtering) */
  exportWithQuery: (
    format: 'csv' | 'json',
    query?: Record<string, any>,
    options?: ExportOptions
  ) => Promise<void>

  /** Loading state for async exports */
  isExporting: Ref<boolean>
}

// Metadata fields that are often excluded
const METADATA_FIELDS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy']
const DEFAULT_EXCLUDED = ['teamId']
const MAX_EXPORT_ROWS = 10000

/**
 * Collection export composable
 *
 * Provides CSV and JSON export capabilities for collection data.
 * Works with useCollectionQuery for client-side data or fetches server data directly.
 *
 * @example
 * ```typescript
 * const { items } = await useCollectionQuery('products')
 * const { exportCSV, exportJSON } = useCollectionExport('products')
 *
 * // Export current items to CSV
 * exportCSV(items.value)
 *
 * // Export with custom fields
 * exportCSV(items.value, {
 *   fields: [
 *     { key: 'name', label: 'Product Name' },
 *     { key: 'price', label: 'Price ($)', transform: (v) => v.toFixed(2) }
 *   ],
 *   filename: 'products-report'
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Export with server query (fetches all matching data)
 * const { exportWithQuery, isExporting } = useCollectionExport('orders')
 *
 * await exportWithQuery('csv', { status: 'completed' }, {
 *   excludeFields: ['internalNotes']
 * })
 * ```
 */
export function useCollectionExport(collection: string): UseCollectionExportReturn {
  const isExporting = ref(false)
  const { getTeamId } = useTeamContext()
  const collections = useCollections()
  const { tString } = useT()

  /**
   * Resolve field configuration from rows and options
   */
  function resolveFields(
    rows: any[],
    options: ExportOptions
  ): ExportField[] {
    if (!rows.length) return []

    const sampleRow = rows[0]
    let fieldKeys: string[]

    if (options.fields) {
      // Use specified fields
      fieldKeys = options.fields.map(f => typeof f === 'string' ? f : f.key)
    }
    else {
      // Use all fields from first row
      fieldKeys = Object.keys(sampleRow)
    }

    // Apply exclusions
    const excludeSet = new Set([
      ...DEFAULT_EXCLUDED,
      ...(options.excludeFields || []),
      ...(!options.includeId ? ['id'] : []),
      ...(!options.includeMetadata ? METADATA_FIELDS : [])
    ])

    fieldKeys = fieldKeys.filter(key => !excludeSet.has(key))

    // Convert to ExportField objects
    return fieldKeys.map((key) => {
      const fieldConfig = options.fields?.find(
        f => (typeof f === 'string' ? f : f.key) === key
      )

      if (typeof fieldConfig === 'object') {
        return fieldConfig
      }

      return { key, label: key }
    })
  }

  /**
   * Format a value for export
   */
  function formatValue(
    value: any,
    field: ExportField,
    row: any,
    options: ExportOptions
  ): any {
    // Apply custom transform first
    if (field.transform) {
      value = field.transform(value, row)
    }

    // Handle null/undefined
    if (value == null) {
      return ''
    }

    // Handle dates
    if (value instanceof Date) {
      switch (options.dateFormat) {
        case 'timestamp':
          return value.getTime()
        case 'locale':
          return value.toLocaleString()
        case 'iso':
        default:
          return value.toISOString()
      }
    }

    // Handle date strings (ISO format detection)
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        switch (options.dateFormat) {
          case 'timestamp':
            return date.getTime()
          case 'locale':
            return date.toLocaleString()
          case 'iso':
          default:
            return value // Keep original ISO string
        }
      }
    }

    // Handle arrays and objects
    if (typeof value === 'object') {
      if (options.flattenNested) {
        return JSON.stringify(value)
      }
      // For CSV, always stringify objects
      return JSON.stringify(value)
    }

    return value
  }

  /**
   * Escape a value for CSV
   */
  function escapeCSV(value: any): string {
    if (value == null) return ''

    const str = String(value)

    // Check if we need to quote
    const needsQuoting = str.includes(',')
      || str.includes('"')
      || str.includes('\n')
      || str.includes('\r')

    if (needsQuoting) {
      // Escape double quotes by doubling them
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }

  /**
   * Generate CSV content
   */
  function generateCSV(rows: any[], options: ExportOptions = {}): string {
    if (!rows.length) return ''

    const fields = resolveFields(rows, options)

    // Header row
    const headers = fields.map(f => escapeCSV(f.label || f.key))
    const headerLine = headers.join(',')

    // Data rows
    const dataLines = rows.map((row) => {
      // Apply row transform
      const transformedRow = options.transformRow
        ? options.transformRow(row)
        : row

      return fields
        .map((field) => {
          const value = transformedRow[field.key]
          const formatted = formatValue(value, field, transformedRow, options)
          return escapeCSV(formatted)
        })
        .join(',')
    })

    // Add BOM for Excel compatibility with UTF-8
    const BOM = '\uFEFF'
    return BOM + [headerLine, ...dataLines].join('\n')
  }

  /**
   * Generate JSON content
   */
  function generateJSON(rows: any[], options: ExportOptions = {}): string {
    const fields = resolveFields(rows, options)

    const exportData = rows.map((row) => {
      // Apply row transform
      const transformedRow = options.transformRow
        ? options.transformRow(row)
        : row

      // Filter to only included fields
      const filtered: Record<string, any> = {}

      for (const field of fields) {
        const value = transformedRow[field.key]
        filtered[field.key] = formatValue(value, field, transformedRow, options)
      }

      return filtered
    })

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Trigger file download
   */
  function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(url)
  }

  /**
   * Generate filename with timestamp
   */
  function generateFilename(options: ExportOptions, extension: string): string {
    const base = options.filename || collection
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return `${base}-${timestamp}.${extension}`
  }

  // ============ Public Methods ============

  /**
   * Export rows to CSV file
   */
  function exportCSV(rows: any[], options: ExportOptions = {}): void {
    if (!rows.length) {
      console.warn(`[useCollectionExport] ${tString('export.noData')}`)
      return
    }

    const csv = generateCSV(rows, options)
    const filename = generateFilename(options, 'csv')
    downloadFile(csv, filename, 'text/csv')
  }

  /**
   * Export rows to JSON file
   */
  function exportJSON(rows: any[], options: ExportOptions = {}): void {
    if (!rows.length) {
      console.warn(`[useCollectionExport] ${tString('export.noData')}`)
      return
    }

    const json = generateJSON(rows, options)
    const filename = generateFilename(options, 'json')
    downloadFile(json, filename, 'application/json')
  }

  /**
   * Export with server query (fetches all matching data)
   */
  async function exportWithQuery(
    format: 'csv' | 'json',
    query: Record<string, any> = {},
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true

    try {
      const config = collections.getConfig(collection)
      const apiPath = config?.apiPath || collection
      const teamId = getTeamId()

      if (!teamId) {
        throw new Error('Team context not available')
      }

      const url = `/api/teams/${teamId}/${apiPath}`

      const data = await $fetch(url, {
        query: {
          ...query,
          limit: MAX_EXPORT_ROWS,
          page: undefined
        }
      })

      const rows = Array.isArray(data) ? data : (data as any).items || (data as any).data || []

      if (format === 'csv') {
        exportCSV(rows, options)
      }
      else {
        exportJSON(rows, options)
      }
    }
    catch (error) {
      console.error('[useCollectionExport] Export failed:', error)
      throw error
    }
    finally {
      isExporting.value = false
    }
  }

  return {
    exportCSV,
    exportJSON,
    exportWithQuery,
    isExporting
  }
}
