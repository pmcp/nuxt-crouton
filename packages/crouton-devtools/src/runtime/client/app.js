const { createApp } = Vue

createApp({
  data() {
    return {
      activeTab: 'collections',

      // Collections
      collections: [],
      loading: false,
      error: null,
      searchQuery: '',
      selectedCollection: null,

      // Operations
      operations: [],
      operationsLoading: false,
      operationsError: null,
      selectedOperation: null,
      stats: null,
      filters: {
        collection: '',
        operation: '',
        status: '',
        mcpOnly: false
      },
      autoRefreshInterval: null,

      // System Operations (D1)
      systemOperations: [],
      systemOpsLoading: false,
      systemOpsStats: null,
      selectedSystemOperation: null,
      sysOpsFilters: {
        type: '',
        source: '',
        timeRange: ''
      },
      sysOpsAutoRefreshInterval: null,

      // API Explorer
      endpoints: [],
      endpointsLoading: false,
      selectedEndpoint: null,
      selectedEndpointCollection: '',
      requestParams: {},
      requestBody: '',
      customHeaders: [],
      requestInProgress: false,
      apiResponse: null,

      // Data Browser (Phase 3)
      selectedDataCollection: '',
      selectedLayout: 'table',
      iframeLoaded: false,

      // Activity (Events Integration)
      events: [],
      eventsLoading: false,
      eventsAvailable: false,
      eventsHealth: null,
      eventFilters: {
        collection: '',
        operation: '',
        limit: 50
      },
      selectedEvent: null,

      // Operation ↔ Event Correlation
      correlatedEvents: [],
      correlatedEventsLoading: false,

      // Generation History (D3: Generators tab)
      generationHistory: [],
      generationHistoryLoading: false,
      generationHistoryFound: false
    }
  },
  computed: {
    filteredCollections() {
      if (!this.searchQuery) return this.collections

      const query = this.searchQuery.toLowerCase()
      return this.collections.filter(c =>
        c.name?.toLowerCase().includes(query) ||
        c.layer?.toLowerCase().includes(query) ||
        c.apiPath?.toLowerCase().includes(query) ||
        c.key?.toLowerCase().includes(query)
      )
    },
    filteredOperations() {
      let ops = this.operations

      if (this.filters.collection) {
        ops = ops.filter(op => op.collection === this.filters.collection)
      }

      if (this.filters.operation) {
        ops = ops.filter(op => op.operation === this.filters.operation)
      }

      if (this.filters.status) {
        const isError = this.filters.status === 'error'
        ops = ops.filter(op => {
          return isError ? op.status >= 400 : op.status < 400
        })
      }

      if (this.filters.mcpOnly) {
        ops = ops.filter(op => op.metadata && op.metadata.mutationSource === 'mcp')
      }

      return ops
    },
    uniqueCollections() {
      const collections = new Set(this.operations.map(op => op.collection))
      return Array.from(collections).sort()
    },
    filteredSystemOperations() {
      let ops = this.systemOperations

      if (this.sysOpsFilters.type) {
        ops = ops.filter(op => op.type === this.sysOpsFilters.type || op.type.startsWith(this.sysOpsFilters.type + ':'))
      }

      if (this.sysOpsFilters.source) {
        ops = ops.filter(op => op.source === this.sysOpsFilters.source)
      }

      if (this.sysOpsFilters.timeRange) {
        const minutes = parseInt(this.sysOpsFilters.timeRange, 10)
        const since = Date.now() - minutes * 60 * 1000
        ops = ops.filter(op => op.timestamp >= since)
      }

      return ops
    },
    uniqueSysOpsTypes() {
      const types = new Set(this.systemOperations.map(op => op.type))
      return Array.from(types).sort()
    },
    uniqueSysOpsSources() {
      const sources = new Set(this.systemOperations.map(op => op.source))
      return Array.from(sources).sort()
    },
    filteredEndpoints() {
      if (!this.selectedEndpointCollection) return this.endpoints
      return this.endpoints.filter(e => e.collection === this.selectedEndpointCollection)
    },
    endpointCollections() {
      const collections = new Set(this.endpoints.map(e => e.collection))
      return Array.from(collections).sort()
    }
  },
  methods: {
    // Collections methods
    async fetchCollections() {
      try {
        this.loading = true
        this.error = null
        const response = await fetch('/__nuxt_crouton_devtools/api/collections')
        const data = await response.json()
        this.collections = data.data || []
      } catch (e) {
        this.error = e.message
      } finally {
        this.loading = false
      }
    },
    viewCollectionDetails(collection) {
      this.selectedCollection = collection
    },
    closeCollectionDetails() {
      this.selectedCollection = null
    },
    getLayerBadgeClass(layer) {
      const classes = {
        'external': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'internal': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'unknown': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      }
      return classes[layer] || classes.unknown
    },

    // Operations methods
    async fetchOperations() {
      try {
        this.operationsLoading = true
        this.operationsError = null

        const response = await fetch('/__nuxt_crouton_devtools/api/operations')
        const data = await response.json()
        this.operations = data.data || []

        const statsResponse = await fetch('/__nuxt_crouton_devtools/api/operations/stats')
        const statsData = await statsResponse.json()
        this.stats = statsData.data || null
      } catch (e) {
        this.operationsError = e.message
      } finally {
        this.operationsLoading = false
      }
    },
    async clearAllOperations() {
      if (!confirm('Clear all operation history?')) return

      try {
        await fetch('/__nuxt_crouton_devtools/api/operations/clear', {
          method: 'POST'
        })
        this.operations = []
        this.stats = {
          total: 0,
          successRate: 0,
          avgDuration: 0,
          failed: 0,
          successful: 0,
          byCollection: {},
          byOperation: {}
        }
      } catch (e) {
        alert('Failed to clear operations: ' + e.message)
      }
    },
    viewOperationDetails(operation) {
      this.selectedOperation = operation
      // Fetch correlated events if events are available
      if (this.eventsAvailable && operation.itemId) {
        this.fetchCorrelatedEvents(operation)
      } else {
        this.correlatedEvents = []
      }
    },
    closeOperationDetails() {
      this.selectedOperation = null
      this.correlatedEvents = []
    },
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    },
    formatFullTime(timestamp) {
      const date = new Date(timestamp)
      return date.toLocaleString()
    },
    getOperationBadgeClass(operation) {
      const classes = {
        'list': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'get': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'create': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        'update': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        'delete': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
      return classes[operation] || 'bg-gray-100 text-gray-800'
    },
    getStatusClass(status) {
      if (status >= 500) return 'text-red-600 dark:text-red-400'
      if (status >= 400) return 'text-orange-600 dark:text-orange-400'
      return 'text-green-600 dark:text-green-400'
    },

    // API Explorer methods
    async fetchEndpoints() {
      try {
        this.endpointsLoading = true
        const response = await fetch('/__nuxt_crouton_devtools/api/endpoints')
        const data = await response.json()
        this.endpoints = data.data || []
      } catch (e) {
        console.error('Failed to fetch endpoints:', e)
      } finally {
        this.endpointsLoading = false
      }
    },
    selectEndpoint(endpoint) {
      this.selectedEndpoint = endpoint
      this.requestParams = {}
      this.requestBody = ''
      this.customHeaders = []
      this.apiResponse = null
    },
    addHeader() {
      this.customHeaders.push({ key: '', value: '' })
    },
    removeHeader(index) {
      this.customHeaders.splice(index, 1)
    },
    async executeEndpoint() {
      if (this.requestInProgress) return

      try {
        this.requestInProgress = true

        // Build headers
        const headers = {}
        this.customHeaders.forEach(h => {
          if (h.key && h.value) {
            headers[h.key] = h.value
          }
        })

        // Parse request body if present
        let parsedBody = null
        if (this.selectedEndpoint.requiresBody && this.requestBody) {
          try {
            parsedBody = JSON.parse(this.requestBody)
          } catch (e) {
            alert('Invalid JSON in request body: ' + e.message)
            this.requestInProgress = false
            return
          }
        }

        // Send request
        const response = await fetch('/__nuxt_crouton_devtools/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: this.selectedEndpoint.method,
            path: this.selectedEndpoint.path,
            params: this.requestParams,
            requestBody: parsedBody,
            headers
          })
        })

        const data = await response.json()
        this.apiResponse = data
      } catch (e) {
        this.apiResponse = {
          success: false,
          status: 0,
          error: 'Request failed: ' + e.message,
          data: null,
          duration: 0
        }
      } finally {
        this.requestInProgress = false
      }
    },
    getMethodBadgeClass(method) {
      const classes = {
        'GET': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'POST': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'PATCH': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        'PUT': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
      return classes[method] || 'bg-gray-100 text-gray-800'
    },
    formatJson(data) {
      if (data === null || data === undefined) return 'null'
      return JSON.stringify(data, null, 2)
    },
    copyResponse() {
      const text = this.formatJson(this.apiResponse.data)
      navigator.clipboard.writeText(text).then(() => {
        alert('Response copied to clipboard!')
      })
    },
    copyAsCurl() {
      let curl = 'curl -X ' + this.selectedEndpoint.method + ' '

      // Build URL
      let url = this.selectedEndpoint.path
      if (this.requestParams) {
        for (const [key, value] of Object.entries(this.requestParams)) {
          if (url.includes(':' + key)) {
            url = url.replace(':' + key, value)
          }
        }
      }

      // Add query params for GET
      if (this.selectedEndpoint.method === 'GET' && this.requestParams) {
        const queryParams = new URLSearchParams()
        for (const [key, value] of Object.entries(this.requestParams)) {
          if (!this.selectedEndpoint.path.includes(':' + key) && value) {
            queryParams.append(key, value)
          }
        }
        const queryString = queryParams.toString()
        if (queryString) {
          url += '?' + queryString
        }
      }

      curl += '"' + window.location.origin + url + '" '

      // Add headers
      curl += '-H "Content-Type: application/json" '
      this.customHeaders.forEach(h => {
        if (h.key && h.value) {
          curl += '-H "' + h.key + ': ' + h.value + '" '
        }
      })

      // Add body
      if (this.selectedEndpoint.requiresBody && this.requestBody) {
        curl += "-d '" + this.requestBody + "'"
      }

      navigator.clipboard.writeText(curl).then(() => {
        alert('cURL command copied to clipboard!')
      })
    },
    copyAsFetch() {
      // Build URL with params
      let url = this.selectedEndpoint.path
      if (this.requestParams) {
        for (const [key, value] of Object.entries(this.requestParams)) {
          if (url.includes(':' + key)) {
            url = url.replace(':' + key, value)
          }
        }
      }

      // Add query params for GET
      if (this.selectedEndpoint.method === 'GET' && this.requestParams) {
        const queryParams = new URLSearchParams()
        for (const [key, value] of Object.entries(this.requestParams)) {
          if (!this.selectedEndpoint.path.includes(':' + key) && value) {
            queryParams.append(key, value)
          }
        }
        const queryString = queryParams.toString()
        if (queryString) {
          url += '?' + queryString
        }
      }

      let fetchCode = "fetch('" + url + "', {\\n  method: '" + this.selectedEndpoint.method + "'"

      // Add headers
      const headers = { 'Content-Type': 'application/json' }
      this.customHeaders.forEach(h => {
        if (h.key && h.value) {
          headers[h.key] = h.value
        }
      })
      fetchCode += ',\\n  headers: ' + JSON.stringify(headers, null, 2)

      // Add body
      if (this.selectedEndpoint.requiresBody && this.requestBody) {
        fetchCode += ',\\n  body: JSON.stringify(' + this.requestBody + ')'
      }

      fetchCode += '\\n})'

      navigator.clipboard.writeText(fetchCode).then(() => {
        alert('fetch() code copied to clipboard!')
      })
    },

    // System Operations methods (D1)
    async fetchSystemOperations() {
      try {
        this.systemOpsLoading = true
        const params = new URLSearchParams()
        if (this.sysOpsFilters.type) params.set('type', this.sysOpsFilters.type)
        if (this.sysOpsFilters.source) params.set('source', this.sysOpsFilters.source)
        if (this.sysOpsFilters.timeRange) {
          const minutes = parseInt(this.sysOpsFilters.timeRange, 10)
          params.set('since', String(Date.now() - minutes * 60 * 1000))
        }

        const response = await fetch('/__nuxt_crouton_devtools/api/system-operations?' + params.toString())
        const data = await response.json()
        this.systemOperations = data.data || []
        this.systemOpsStats = data.stats || null
      } catch (e) {
        console.error('Failed to fetch system operations:', e)
        this.systemOperations = []
      } finally {
        this.systemOpsLoading = false
      }
    },
    async clearAllSystemOperations() {
      if (!confirm('Clear all system operation history?')) return
      try {
        await fetch('/__nuxt_crouton_devtools/api/system-operations/clear', { method: 'POST' })
        this.systemOperations = []
        this.systemOpsStats = { total: 0, byType: {}, bySource: {} }
      } catch (e) {
        alert('Failed to clear system operations: ' + e.message)
      }
    },
    viewSystemOperationDetails(op) {
      this.selectedSystemOperation = op
    },
    closeSystemOperationDetails() {
      this.selectedSystemOperation = null
    },
    getSysOpTypeBadgeClass(type) {
      if (!type) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      const prefix = type.split(':')[0]
      const classes = {
        'auth': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        'admin': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        'ai': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
        'email': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
        'webhook': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
        'payment': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        'mcp': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300'
      }
      return classes[prefix] || 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    },
    startSysOpsAutoRefresh() {
      this.sysOpsAutoRefreshInterval = setInterval(() => {
        if (this.activeTab === 'system-ops') {
          this.fetchSystemOperations()
        }
      }, 3000)
    },
    stopSysOpsAutoRefresh() {
      if (this.sysOpsAutoRefreshInterval) {
        clearInterval(this.sysOpsAutoRefreshInterval)
        this.sysOpsAutoRefreshInterval = null
      }
    },

    startAutoRefresh() {
      // Auto-refresh operations every 3 seconds when on operations tab
      this.autoRefreshInterval = setInterval(() => {
        if (this.activeTab === 'operations') {
          this.fetchOperations()
        }
      }, 3000)
    },
    stopAutoRefresh() {
      if (this.autoRefreshInterval) {
        clearInterval(this.autoRefreshInterval)
        this.autoRefreshInterval = null
      }
    },

    // Data Browser methods
    getLayoutIcon(layout) {
      const icons = {
        'table': 'fas fa-table',
        'list': 'fas fa-list',
        'grid': 'fas fa-th',
        'cards': 'fas fa-th-large'
      }
      return icons[layout] || 'fas fa-table'
    },

    // Activity (Events) methods
    async fetchEvents() {
      try {
        this.eventsLoading = true
        const params = new URLSearchParams()
        if (this.eventFilters.collection) params.set('collection', this.eventFilters.collection)
        if (this.eventFilters.operation) params.set('operation', this.eventFilters.operation)
        if (this.eventFilters.limit) params.set('limit', String(this.eventFilters.limit))

        const response = await fetch('/__nuxt_crouton_devtools/api/events?' + params.toString())
        const data = await response.json()

        if (data.success && data.available) {
          this.events = data.data || []
          this.eventsAvailable = true
        } else {
          this.events = []
          this.eventsAvailable = data.available || false
        }
      } catch (e) {
        console.error('Failed to fetch events:', e)
        this.events = []
      } finally {
        this.eventsLoading = false
      }
    },
    async fetchEventsHealth() {
      try {
        const response = await fetch('/__nuxt_crouton_devtools/api/events/health')
        const data = await response.json()

        if (data.success && data.available) {
          this.eventsHealth = data.data || null
          this.eventsAvailable = true
        } else {
          this.eventsHealth = null
          this.eventsAvailable = data.available || false
        }
      } catch (e) {
        console.error('Failed to fetch events health:', e)
        this.eventsHealth = null
        this.eventsAvailable = false
      }
    },
    viewEventDetails(evt) {
      this.selectedEvent = evt
    },
    closeEventDetails() {
      this.selectedEvent = null
    },
    getEventOperationClass(operation) {
      const classes = {
        'create': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        'update': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        'delete': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }
      return classes[operation] || 'bg-gray-100 text-gray-800'
    },
    getHealthStatusClass(status) {
      const classes = {
        'healthy': 'text-green-600',
        'warning': 'text-yellow-600',
        'inactive': 'text-gray-400'
      }
      return classes[status] || 'text-gray-600'
    },
    formatHealthStatus(status) {
      const labels = {
        'healthy': 'Healthy',
        'warning': 'Stale',
        'inactive': 'Inactive'
      }
      return labels[status] || status
    },
    formatShortDate(isoString) {
      if (!isoString) return ''
      const date = new Date(isoString)
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    },

    // Operation ↔ Event Correlation
    async fetchCorrelatedEvents(operation) {
      if (!operation.itemId || !operation.collection) {
        this.correlatedEvents = []
        return
      }

      try {
        this.correlatedEventsLoading = true
        const params = new URLSearchParams({
          collection: operation.collection,
          itemId: operation.itemId,
          limit: '10'
        })

        const response = await fetch('/__nuxt_crouton_devtools/api/events?' + params.toString())
        const data = await response.json()

        if (data.success && data.available) {
          this.correlatedEvents = data.data || []
        } else {
          this.correlatedEvents = []
        }
      } catch (e) {
        console.error('Failed to fetch correlated events:', e)
        this.correlatedEvents = []
      } finally {
        this.correlatedEventsLoading = false
      }
    },

    // Generation History (D3)
    async fetchGenerationHistory() {
      try {
        this.generationHistoryLoading = true
        const response = await fetch('/__nuxt_crouton_devtools/api/generation-history')
        const data = await response.json()
        this.generationHistory = data.history || []
        this.generationHistoryFound = data.found || false
      } catch (e) {
        console.error('Failed to fetch generation history:', e)
        this.generationHistory = []
        this.generationHistoryFound = false
      } finally {
        this.generationHistoryLoading = false
      }
    },
    getGeneratorBadgeClass(generator) {
      const classes = {
        'crouton-cli': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
        'mcp': 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
      }
      return classes[generator] || 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
    },
    getLayerColorClass(layer) {
      if (!layer) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      const palette = [
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
        'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
        'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      ]
      let hash = 0
      for (let i = 0; i < layer.length; i++) hash = (hash + layer.charCodeAt(i)) % palette.length
      return palette[hash]
    },
    formatRelativeTime(isoString) {
      if (!isoString) return ''
      const diff = Date.now() - new Date(isoString).getTime()
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return 'just now'
      if (minutes < 60) return minutes + 'm ago'
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return hours + 'h ago'
      const days = Math.floor(hours / 24)
      return days + 'd ago'
    }
  },
  watch: {
    activeTab(newTab) {
      if (newTab === 'operations') {
        this.fetchOperations()
        this.startAutoRefresh()
      } else {
        this.stopAutoRefresh()
      }

      if (newTab === 'activity') {
        this.fetchEvents()
        this.fetchEventsHealth()
      }

      if (newTab === 'system-ops') {
        this.fetchSystemOperations()
        this.startSysOpsAutoRefresh()
      } else {
        this.stopSysOpsAutoRefresh()
      }

      if (newTab === 'generators') {
        this.fetchGenerationHistory()
      }
    },
    selectedDataCollection() {
      this.iframeLoaded = false
    }
  },
  mounted() {
    this.fetchCollections()
    this.fetchOperations()
    this.fetchEndpoints()
    // Check if events package is available
    this.fetchEventsHealth()
    this.fetchEvents()
    // Fetch system operations in background
    this.fetchSystemOperations()
  },
  beforeUnmount() {
    this.stopAutoRefresh()
    this.stopSysOpsAutoRefresh()
  }
}).mount('#app')
