/**
 * Export composable for Crouton Events
 * Provides CSV and JSON export functionality for audit logs
 */
import type { FilterState } from '../types/events'

interface ExportOptions {
  filters?: FilterState
  filename?: string
}

export function useCroutonEventsExport() {
  const { getTeamId } = useTeamContext()
  const exporting = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Download a file in the browser
   */
  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Generate filename with timestamp
   */
  function generateFilename(format: 'csv' | 'json', prefix = 'audit-log'): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `${prefix}-${timestamp}.${format}`
  }

  /**
   * Build query params from filters
   */
  function buildExportQuery(format: 'csv' | 'json', filters?: FilterState): Record<string, string> {
    const query: Record<string, string> = { format }

    if (filters?.collectionName) {
      query.collectionName = filters.collectionName
    }
    if (filters?.operation) {
      query.operation = filters.operation
    }
    if (filters?.userId) {
      query.userId = filters.userId
    }
    if (filters?.dateFrom) {
      query.dateFrom = filters.dateFrom.toISOString()
    }
    if (filters?.dateTo) {
      query.dateTo = filters.dateTo.toISOString()
    }

    return query
  }

  /**
   * Export events in the given format
   */
  async function exportEvents(format: 'csv' | 'json', options: ExportOptions = {}) {
    const teamId = getTeamId()
    if (!teamId) {
      throw new Error('Team context required for export')
    }

    exporting.value = true
    error.value = null

    try {
      const query = buildExportQuery(format, options.filters)
      const response = await $fetch(`/api/teams/${teamId}/crouton-events/export`, {
        query,
        credentials: 'include'
      })

      const content = format === 'json'
        ? JSON.stringify(response, null, 2)
        : response as string

      const mimeType = format === 'json' ? 'application/json' : 'text/csv'
      const filename = options.filename || generateFilename(format)
      downloadFile(content, filename, mimeType)

      return { success: true }
    } catch (err) {
      error.value = err as Error
      console.error(`[CroutonEventsExport] ${format.toUpperCase()} export failed:`, err)
      throw err
    } finally {
      exporting.value = false
    }
  }

  // Keep named helpers for backwards compatibility
  const exportToCSV = (options: ExportOptions = {}) => exportEvents('csv', options)
  const exportToJSON = (options: ExportOptions = {}) => exportEvents('json', options)

  return {
    exportEvents,
    exportToCSV,
    exportToJSON,
    exporting: readonly(exporting),
    error: readonly(error)
  }
}
