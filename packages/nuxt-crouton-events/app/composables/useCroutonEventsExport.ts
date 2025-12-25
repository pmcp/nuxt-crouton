/**
 * Export composable for Crouton Events
 * Provides CSV and JSON export functionality for audit logs
 */

interface EventFilters {
  collectionName?: string
  operation?: 'create' | 'update' | 'delete'
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

interface ExportOptions {
  filters?: EventFilters
  format: 'csv' | 'json'
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
   * Export events as CSV
   */
  async function exportToCSV(options: Omit<ExportOptions, 'format'> = {}) {
    const teamId = getTeamId()
    if (!teamId) {
      throw new Error('Team context required for export')
    }

    exporting.value = true
    error.value = null

    try {
      const query: Record<string, string> = {
        format: 'csv'
      }

      if (options.filters?.collectionName) {
        query.collectionName = options.filters.collectionName
      }
      if (options.filters?.operation) {
        query.operation = options.filters.operation
      }
      if (options.filters?.userId) {
        query.userId = options.filters.userId
      }
      if (options.filters?.dateFrom) {
        query.dateFrom = options.filters.dateFrom.toISOString()
      }
      if (options.filters?.dateTo) {
        query.dateTo = options.filters.dateTo.toISOString()
      }

      const response = await $fetch<string>(`/api/teams/${teamId}/crouton-events/export`, {
        query,
        credentials: 'include'
      })

      const filename = options.filename || generateFilename('csv')
      downloadFile(response, filename, 'text/csv')

      return { success: true }
    } catch (err) {
      error.value = err as Error
      console.error('[CroutonEventsExport] CSV export failed:', err)
      throw err
    } finally {
      exporting.value = false
    }
  }

  /**
   * Export events as JSON
   */
  async function exportToJSON(options: Omit<ExportOptions, 'format'> = {}) {
    const teamId = getTeamId()
    if (!teamId) {
      throw new Error('Team context required for export')
    }

    exporting.value = true
    error.value = null

    try {
      const query: Record<string, string> = {
        format: 'json'
      }

      if (options.filters?.collectionName) {
        query.collectionName = options.filters.collectionName
      }
      if (options.filters?.operation) {
        query.operation = options.filters.operation
      }
      if (options.filters?.userId) {
        query.userId = options.filters.userId
      }
      if (options.filters?.dateFrom) {
        query.dateFrom = options.filters.dateFrom.toISOString()
      }
      if (options.filters?.dateTo) {
        query.dateTo = options.filters.dateTo.toISOString()
      }

      const response = await $fetch<object>(`/api/teams/${teamId}/crouton-events/export`, {
        query,
        credentials: 'include'
      })

      const content = JSON.stringify(response, null, 2)
      const filename = options.filename || generateFilename('json')
      downloadFile(content, filename, 'application/json')

      return { success: true }
    } catch (err) {
      error.value = err as Error
      console.error('[CroutonEventsExport] JSON export failed:', err)
      throw err
    } finally {
      exporting.value = false
    }
  }

  return {
    exportToCSV,
    exportToJSON,
    exporting: readonly(exporting),
    error: readonly(error)
  }
}
