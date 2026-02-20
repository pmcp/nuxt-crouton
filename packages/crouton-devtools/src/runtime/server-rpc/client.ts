import { defineEventHandler, setResponseHeader } from 'h3'

// Enhanced DevTools client with Collections and Operations monitoring
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crouton DevTools</title>
  <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  <style>
    [v-cloak] { display: none; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
    .fade-enter-from, .fade-leave-to { opacity: 0; }
    .modal-enter-active, .modal-leave-active { transition: all 0.3s; }
    .modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
    .tab-active { border-bottom: 2px solid #0ea5e9; color: #0ea5e9; }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900">
  <div id="app" v-cloak>
    <div class="min-h-screen">
      <!-- Header with Tabs -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div class="container mx-auto px-6 py-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <i class="fas fa-table text-primary-600 dark:text-primary-400 text-2xl"></i>
              <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Crouton DevTools</h1>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Development monitoring and debugging
                </p>
              </div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="flex gap-6 border-b border-gray-200 dark:border-gray-700 -mb-px">
            <button
              @click="activeTab = 'collections'"
              :class="{ 'tab-active': activeTab === 'collections' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-table mr-2"></i>
              Collections ({{ collections.length }})
            </button>
            <button
              @click="activeTab = 'operations'"
              :class="{ 'tab-active': activeTab === 'operations' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-chart-line mr-2"></i>
              Operations ({{ operations.length }})
            </button>
            <button
              @click="activeTab = 'api-explorer'"
              :class="{ 'tab-active': activeTab === 'api-explorer' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-rocket mr-2"></i>
              API Explorer
            </button>
            <button
              @click="activeTab = 'data-browser'"
              :class="{ 'tab-active': activeTab === 'data-browser' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-database mr-2"></i>
              Data Browser
            </button>
            <button
              v-if="eventsAvailable"
              @click="activeTab = 'activity'"
              :class="{ 'tab-active': activeTab === 'activity' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-history mr-2"></i>
              Activity ({{ events.length }})
            </button>
            <button
              @click="activeTab = 'system-ops'"
              :class="{ 'tab-active': activeTab === 'system-ops' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-cogs mr-2"></i>
              System Ops ({{ systemOperations.length }})
            </button>
            <button
              @click="activeTab = 'generators'"
              :class="{ 'tab-active': activeTab === 'generators' }"
              class="pb-3 px-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <i class="fas fa-code-branch mr-2"></i>
              Generators ({{ generationHistory.length }})
            </button>
          </div>
        </div>
      </div>

      <div class="container mx-auto px-6 py-6">
        <!-- Collections Tab -->
        <div v-show="activeTab === 'collections'">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Registered Collections</h2>
            <button
              @click="fetchCollections"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
              :disabled="loading"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': loading }"></i>
              Refresh
            </button>
          </div>

          <!-- Search -->
          <div class="mb-6">
            <div class="relative">
              <i class="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search collections by name, layer, or API path..."
                class="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
              <span v-if="searchQuery" @click="searchQuery = ''" class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                <i class="fas fa-times"></i>
              </span>
            </div>
            <div v-if="filteredCollections.length !== collections.length" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Showing {{ filteredCollections.length }} of {{ collections.length }} collections
            </div>
          </div>

          <!-- Loading -->
          <transition name="fade">
            <div v-if="loading" class="flex items-center justify-center py-16">
              <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
                <p class="text-gray-600 dark:text-gray-400 font-medium">Loading collections...</p>
              </div>
            </div>
          </transition>

          <!-- Error -->
          <transition name="fade">
            <div v-if="error && !loading" class="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-6">
              <div class="flex items-start gap-4">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mt-1"></i>
                <div class="flex-1">
                  <h3 class="font-semibold text-red-900 dark:text-red-300 mb-1 text-lg">Failed to load collections</h3>
                  <p class="text-red-700 dark:text-red-400">{{ error }}</p>
                  <button
                    @click="fetchCollections"
                    class="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </transition>

          <!-- Empty State -->
          <transition name="fade">
            <div v-if="!loading && !error && filteredCollections.length === 0" class="text-center py-16">
              <i class="fas fa-box-open text-gray-300 dark:text-gray-600 text-6xl mb-6"></i>
              <h3 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No collections found</h3>
              <p class="text-gray-600 dark:text-gray-400 mb-6">
                {{ searchQuery ? 'Try adjusting your search query' : 'Add collections to your app.config.ts to get started' }}
              </p>
              <button v-if="searchQuery" @click="searchQuery = ''" class="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                Clear Search
              </button>
            </div>
          </transition>

          <!-- Collections Grid -->
          <transition name="fade">
            <div v-if="!loading && !error && filteredCollections.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="collection in filteredCollections"
                :key="collection.key"
                @click="viewCollectionDetails(collection)"
                class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-xl hover:scale-105 transition-all cursor-pointer group"
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="fas fa-table text-primary-600 dark:text-primary-400"></i>
                      <h3 class="text-lg font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {{ collection.name }}
                      </h3>
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ collection.apiPath || collection.key }}</p>
                  </div>
                  <span
                    v-if="collection.layer"
                    :class="getLayerBadgeClass(collection.layer)"
                    class="px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap"
                  >
                    {{ collection.layer }}
                  </span>
                </div>

                <div v-if="collection.meta?.description" class="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {{ collection.meta.description }}
                </div>

                <div class="space-y-2">
                  <div v-if="collection.componentName" class="flex items-center gap-2 text-sm">
                    <i class="fas fa-file-code text-gray-400 w-4"></i>
                    <code class="bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-xs flex-1 truncate">{{ collection.componentName }}</code>
                  </div>
                  <div v-if="collection.columns && collection.columns.length" class="flex items-center gap-2 text-sm">
                    <i class="fas fa-columns text-gray-400 w-4"></i>
                    <span class="text-gray-600 dark:text-gray-400">{{ collection.columns.length }} columns</span>
                  </div>
                </div>

                <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                  <span class="font-mono">{{ collection.key }}</span>
                  <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            </div>
          </transition>

          <!-- Collection Detail Modal -->
          <transition name="fade">
            <div v-if="selectedCollection" @click.self="closeCollectionDetails" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <transition name="modal">
                <div v-if="selectedCollection" @click.stop class="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                  <!-- Modal Header -->
                  <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between z-10">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                        <i class="fas fa-table text-primary-600 dark:text-primary-400 text-xl"></i>
                      </div>
                      <div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">{{ selectedCollection.name }}</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">Collection Details</p>
                      </div>
                    </div>
                    <button
                      @click="closeCollectionDetails"
                      class="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <i class="fas fa-times text-xl"></i>
                    </button>
                  </div>

                  <!-- Modal Content -->
                  <div class="p-6 space-y-6">
                    <!-- Configuration -->
                    <div>
                      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <i class="fas fa-cog"></i>
                        Configuration
                      </h3>
                      <div class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-3">
                        <div class="flex justify-between items-center py-2">
                          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Key</span>
                          <code class="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg text-sm">{{ selectedCollection.key }}</code>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700"></div>
                        <div class="flex justify-between items-center py-2">
                          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">API Path</span>
                          <code class="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg text-sm">{{ selectedCollection.apiPath || 'N/A' }}</code>
                        </div>
                        <div v-if="selectedCollection.componentName" class="border-t border-gray-200 dark:border-gray-700"></div>
                        <div v-if="selectedCollection.componentName" class="flex justify-between items-center py-2">
                          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Component</span>
                          <code class="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg text-sm">{{ selectedCollection.componentName }}</code>
                        </div>
                        <div class="border-t border-gray-200 dark:border-gray-700"></div>
                        <div class="flex justify-between items-center py-2">
                          <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Layer</span>
                          <span :class="getLayerBadgeClass(selectedCollection.layer || 'unknown')" class="px-3 py-1 text-xs font-semibold rounded-full">
                            {{ selectedCollection.layer || 'unknown' }}
                          </span>
                        </div>
                      </div>
                    </div>

                    <!-- Columns -->
                    <div v-if="selectedCollection.columns && selectedCollection.columns.length">
                      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <i class="fas fa-columns"></i>
                        Columns ({{ selectedCollection.columns.length }})
                      </h3>
                      <div class="flex flex-wrap gap-2">
                        <span
                          v-for="column in selectedCollection.columns"
                          :key="column"
                          class="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium"
                        >
                          {{ column }}
                        </span>
                      </div>
                    </div>

                    <!-- Full JSON -->
                    <div>
                      <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <i class="fas fa-code"></i>
                        Full Configuration (JSON)
                      </h3>
                      <pre class="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 overflow-auto text-xs font-mono border border-gray-200 dark:border-gray-700">{{ JSON.stringify(selectedCollection, null, 2) }}</pre>
                    </div>
                  </div>

                  <!-- Modal Footer -->
                  <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                    <button
                      @click="closeCollectionDetails"
                      class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
        </div>

        <!-- Operations Tab -->
        <div v-show="activeTab === 'operations'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">CRUD Operations Monitor</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Real-time tracking of all API operations</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="fetchOperations"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                :disabled="operationsLoading"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': operationsLoading }"></i>
                Refresh
              </button>
              <button
                @click="clearAllOperations"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <i class="fas fa-trash"></i>
                Clear
              </button>
            </div>
          </div>

          <!-- Statistics Cards -->
          <div v-if="stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.total }}</p>
                </div>
                <i class="fas fa-chart-line text-blue-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                  <p class="text-2xl font-bold text-green-600">{{ stats.successRate }}%</p>
                </div>
                <i class="fas fa-check-circle text-green-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Avg Duration</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ stats.avgDuration }}ms</p>
                </div>
                <i class="fas fa-clock text-yellow-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Failed</p>
                  <p class="text-2xl font-bold text-red-600">{{ stats.failed }}</p>
                </div>
                <i class="fas fa-exclamation-circle text-red-500 text-2xl"></i>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Collection</label>
                <select v-model="filters.collection" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Collections</option>
                  <option v-for="col in uniqueCollections" :key="col" :value="col">{{ col }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operation</label>
                <select v-model="filters.operation" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Operations</option>
                  <option value="list">List</option>
                  <option value="get">Get</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select v-model="filters.status" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Status</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <!-- MCP-only toggle (D2) -->
            <div class="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                @click="filters.mcpOnly = !filters.mcpOnly"
                :class="filters.mcpOnly
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'"
                class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-lg transition-colors"
              >
                <span>&#x1F916;</span>
                Show MCP Only
              </button>
              <span v-if="filters.mcpOnly" class="text-xs text-violet-600 dark:text-violet-400 font-medium">
                Showing {{ filteredOperations.length }} MCP-sourced operations
              </span>
            </div>
          </div>

          <!-- Operations List -->
          <div v-if="filteredOperations.length === 0" class="text-center py-16">
            <i class="fas fa-chart-line text-gray-300 dark:text-gray-600 text-6xl mb-6"></i>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No operations yet</h3>
            <p class="text-gray-600 dark:text-gray-400">Make some API calls to see them here</p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="op in filteredOperations"
              :key="op.id"
              @click="viewOperationDetails(op)"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
              :class="{
                'border-l-4 border-l-red-500': op.status >= 400,
                'border-l-4 border-l-violet-500 bg-violet-50 dark:bg-violet-900/10': op.metadata?.mutationSource === 'mcp' && op.status < 400
              }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1">
                  <div class="text-xs text-gray-500 dark:text-gray-400 font-mono w-20">
                    {{ formatTime(op.timestamp) }}
                  </div>
                  <span :class="getOperationBadgeClass(op.operation)" class="px-3 py-1 text-xs font-bold rounded-full uppercase">
                    {{ op.operation }}
                  </span>
                  <!-- MCP source badge (D2) -->
                  <span
                    v-if="op.metadata?.mutationSource === 'mcp'"
                    class="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 flex items-center gap-1"
                    title="MCP-initiated mutation"
                  >
                    <span>&#x1F916;</span> MCP
                  </span>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 dark:text-white">{{ op.collection }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ op.method }} {{ op.path }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span :class="getStatusClass(op.status)" class="font-bold text-sm">
                    {{ op.status }}
                  </span>
                  <span class="text-gray-600 dark:text-gray-400 font-mono text-sm">
                    {{ op.duration }}ms
                  </span>
                  <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Operation Detail Modal -->
          <transition name="fade">
            <div v-if="selectedOperation" @click.self="closeOperationDetails" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <transition name="modal">
                <div v-if="selectedOperation" @click.stop class="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                  <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between z-10">
                    <div>
                      <h2 class="text-xl font-bold text-gray-900 dark:text-white">Operation Details</h2>
                      <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedOperation.id }}</p>
                    </div>
                    <button
                      @click="closeOperationDetails"
                      class="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <i class="fas fa-times text-xl"></i>
                    </button>
                  </div>

                  <div class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Collection</span>
                        <span class="text-gray-900 dark:text-white font-medium">{{ selectedOperation.collection }}</span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Operation</span>
                        <span :class="getOperationBadgeClass(selectedOperation.operation)" class="inline-block px-3 py-1 text-xs font-bold rounded-full uppercase">
                          {{ selectedOperation.operation }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Method</span>
                        <code class="text-gray-900 dark:text-white font-mono">{{ selectedOperation.method }}</code>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Status</span>
                        <span :class="getStatusClass(selectedOperation.status)" class="font-bold">
                          {{ selectedOperation.status }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Duration</span>
                        <span class="text-gray-900 dark:text-white font-mono">{{ selectedOperation.duration }}ms</span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Timestamp</span>
                        <span class="text-gray-900 dark:text-white font-mono text-sm">{{ formatFullTime(selectedOperation.timestamp) }}</span>
                      </div>
                      <!-- Source (D2) -->
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Source</span>
                        <span
                          v-if="selectedOperation.metadata?.mutationSource === 'mcp'"
                          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                        >
                          <span>&#x1F916;</span> MCP
                        </span>
                        <span v-else class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <i class="fas fa-user text-xs"></i> UI
                        </span>
                      </div>
                    </div>

                    <div>
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Path</span>
                      <code class="block bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm font-mono text-gray-900 dark:text-white">{{ selectedOperation.path }}</code>
                    </div>

                    <div v-if="selectedOperation.error">
                      <span class="block text-sm font-medium text-red-600 dark:text-red-400 mb-2">Error</span>
                      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-sm text-red-900 dark:text-red-300">
                        {{ selectedOperation.error }}
                      </div>
                    </div>

                    <div v-if="selectedOperation.teamContext">
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Team Context</span>
                      <code class="block bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm font-mono text-gray-900 dark:text-white">{{ selectedOperation.teamContext }}</code>
                    </div>

                    <!-- Correlated Events Section -->
                    <div v-if="eventsAvailable && selectedOperation.itemId">
                      <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-600 dark:text-gray-400">
                          <i class="fas fa-link mr-1"></i>
                          Linked Events
                        </span>
                        <span v-if="correlatedEventsLoading" class="text-xs text-gray-500">
                          <i class="fas fa-spinner fa-spin mr-1"></i>
                          Loading...
                        </span>
                      </div>

                      <div v-if="correlatedEvents.length > 0" class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 space-y-2">
                        <div
                          v-for="evt in correlatedEvents"
                          :key="evt.id"
                          class="flex items-center justify-between text-sm"
                        >
                          <div class="flex items-center gap-2">
                            <span :class="getEventOperationClass(evt.operation)" class="px-2 py-0.5 text-xs font-bold rounded-full uppercase">
                              {{ evt.operation }}
                            </span>
                            <span class="text-gray-600 dark:text-gray-400 font-mono text-xs">
                              {{ evt.changes?.length || 0 }} changes
                            </span>
                          </div>
                          <span class="text-gray-500 dark:text-gray-400 text-xs">
                            {{ formatTime(evt.timestamp) }}
                          </span>
                        </div>
                      </div>

                      <div v-else-if="!correlatedEventsLoading" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center">
                        <span class="text-sm text-gray-500 dark:text-gray-400">No linked events found</span>
                      </div>
                    </div>

                    <div v-else-if="eventsAvailable && !selectedOperation.itemId">
                      <span class="block text-sm text-gray-500 dark:text-gray-400 italic">
                        <i class="fas fa-info-circle mr-1"></i>
                        No item ID available for event correlation
                      </span>
                    </div>

                    <div>
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Full Data (JSON)</span>
                      <pre class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto text-xs font-mono border border-gray-200 dark:border-gray-700">{{ JSON.stringify(selectedOperation, null, 2) }}</pre>
                    </div>
                  </div>

                  <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                    <button
                      @click="closeOperationDetails"
                      class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
        </div>

        <!-- API Explorer Tab -->
        <div v-show="activeTab === 'api-explorer'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">API Endpoint Explorer</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Test your collection endpoints interactively</p>
            </div>
            <button
              @click="fetchEndpoints"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
              :disabled="endpointsLoading"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': endpointsLoading }"></i>
              Refresh
            </button>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left: Endpoint List -->
            <div class="lg:col-span-1">
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 sticky top-24">
                <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Endpoints</h3>

                <!-- Collection Filter -->
                <div class="mb-4">
                  <select v-model="selectedEndpointCollection" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    <option value="">All Collections</option>
                    <option v-for="col in endpointCollections" :key="col" :value="col">{{ col }}</option>
                  </select>
                </div>

                <div class="space-y-1 max-h-[500px] overflow-auto">
                  <button
                    v-for="endpoint in filteredEndpoints"
                    :key="endpoint.path + endpoint.method"
                    @click="selectEndpoint(endpoint)"
                    class="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    :class="{ 'bg-primary-50 dark:bg-primary-900/20': selectedEndpoint === endpoint }"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span :class="getMethodBadgeClass(endpoint.method)" class="px-2 py-0.5 text-xs font-bold rounded uppercase">
                        {{ endpoint.method }}
                      </span>
                      <span :class="getOperationBadgeClass(endpoint.operation)" class="px-2 py-0.5 text-xs font-bold rounded-full uppercase">
                        {{ endpoint.operation }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 font-mono truncate">{{ endpoint.path }}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">{{ endpoint.collection }}</div>
                  </button>
                </div>
              </div>
            </div>

            <!-- Right: Request Builder & Response -->
            <div class="lg:col-span-2">
              <div v-if="!selectedEndpoint" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 text-center">
                <i class="fas fa-hand-pointer text-gray-300 dark:text-gray-600 text-5xl mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select an Endpoint</h3>
                <p class="text-gray-600 dark:text-gray-400">Choose an endpoint from the list to start testing</p>
              </div>

              <div v-else class="space-y-6">
                <!-- Request Builder -->
                <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div>
                      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Request Builder</h3>
                      <div class="flex items-center gap-2">
                        <span :class="getMethodBadgeClass(selectedEndpoint.method)" class="px-3 py-1 text-xs font-bold rounded uppercase">
                          {{ selectedEndpoint.method }}
                        </span>
                        <code class="text-sm font-mono text-gray-600 dark:text-gray-400">{{ selectedEndpoint.path }}</code>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <button
                        @click="copyAsCurl"
                        class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                        title="Copy as cURL"
                      >
                        <i class="fas fa-terminal mr-1"></i>
                        cURL
                      </button>
                      <button
                        @click="copyAsFetch"
                        class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                        title="Copy as fetch()"
                      >
                        <i class="fas fa-code mr-1"></i>
                        fetch
                      </button>
                    </div>
                  </div>

                  <!-- Parameters -->
                  <div v-if="selectedEndpoint.params && selectedEndpoint.params.length > 0" class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Parameters</h4>
                    <div class="space-y-3">
                      <div v-for="param in selectedEndpoint.params" :key="param.name" class="grid grid-cols-3 gap-3">
                        <div class="col-span-1">
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {{ param.name }}
                            <span v-if="param.required" class="text-red-500">*</span>
                            <span v-if="param.pathParam" class="text-xs text-blue-500 ml-1">(path)</span>
                          </label>
                        </div>
                        <div class="col-span-2">
                          <input
                            v-model="requestParams[param.name]"
                            :placeholder="param.description || param.name"
                            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                          <p v-if="param.description" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ param.description }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Request Body -->
                  <div v-if="selectedEndpoint.requiresBody" class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Request Body (JSON)</h4>
                    <textarea
                      v-model="requestBody"
                      rows="8"
                      placeholder='{ "key": "value" }'
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    ></textarea>
                    <p v-if="selectedEndpoint.bodyDescription" class="text-xs text-gray-500 dark:text-gray-400 mt-1">{{ selectedEndpoint.bodyDescription }}</p>
                  </div>

                  <!-- Custom Headers -->
                  <div class="mb-4">
                    <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Custom Headers (Optional)</h4>
                    <div class="space-y-2">
                      <div v-for="(header, index) in customHeaders" :key="index" class="grid grid-cols-5 gap-2">
                        <input
                          v-model="header.key"
                          placeholder="Header name"
                          class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <input
                          v-model="header.value"
                          placeholder="Header value"
                          class="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                        <button
                          @click="removeHeader(index)"
                          class="px-2 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        >
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                      <button
                        @click="addHeader"
                        class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                      >
                        <i class="fas fa-plus mr-1"></i>
                        Add Header
                      </button>
                    </div>
                  </div>

                  <!-- Send Button -->
                  <button
                    @click="executeEndpoint"
                    :disabled="requestInProgress"
                    class="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <i class="fas" :class="requestInProgress ? 'fa-spinner fa-spin' : 'fa-paper-plane'"></i>
                    {{ requestInProgress ? 'Sending...' : 'Send Request' }}
                  </button>
                </div>

                <!-- Response Viewer -->
                <div v-if="apiResponse" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Response</h3>
                    <div class="flex items-center gap-4">
                      <span :class="getStatusClass(apiResponse.status)" class="font-bold">
                        {{ apiResponse.status }}
                      </span>
                      <span class="text-gray-600 dark:text-gray-400 font-mono text-sm">
                        {{ apiResponse.duration }}ms
                      </span>
                      <button
                        @click="copyResponse"
                        class="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
                      >
                        <i class="fas fa-copy mr-1"></i>
                        Copy
                      </button>
                    </div>
                  </div>

                  <div v-if="apiResponse.error" class="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                    <p class="text-sm font-semibold text-red-900 dark:text-red-300 mb-1">Error</p>
                    <p class="text-sm text-red-700 dark:text-red-400">{{ apiResponse.error }}</p>
                  </div>

                  <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-[500px]">
                    <pre class="text-xs font-mono text-gray-900 dark:text-white">{{ formatJson(apiResponse.data) }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Data Browser Tab (Phase 3) -->
        <div v-show="activeTab === 'data-browser'">
          <div class="mb-6">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Collection Data Browser
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Browse and manage collection data with full CRUD capabilities
            </p>

            <!-- Collection Selector -->
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Collection
              </label>
              <select
                v-model="selectedDataCollection"
                class="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a collection...</option>
                <option v-for="col in collections" :key="col.name" :value="col.name">
                  {{ col.name }}
                </option>
              </select>
            </div>

            <!-- Layout Selector -->
            <div class="mb-4" v-if="selectedDataCollection">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Layout
              </label>
              <div class="flex gap-2">
                <button
                  v-for="layoutOption in ['table', 'list', 'grid', 'cards']"
                  :key="layoutOption"
                  @click="selectedLayout = layoutOption"
                  :class="selectedLayout === layoutOption
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                  class="px-4 py-2 rounded-lg font-medium capitalize transition-colors hover:opacity-80"
                >
                  <i :class="getLayoutIcon(layoutOption)" class="mr-2"></i>
                  {{ layoutOption }}
                </button>
              </div>
            </div>

            <!-- Iframe Viewer -->
            <div v-if="selectedDataCollection" class="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <iframe
                :src="'/__crouton_devtools/data/' + selectedDataCollection + '?layout=' + selectedLayout"
                class="w-full h-[800px] border-0"
                @load="iframeLoaded = true"
              />
              <div v-if="!iframeLoaded" class="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div class="text-center">
                  <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
                  <p class="text-gray-600 dark:text-gray-400">Loading collection data...</p>
                </div>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <i class="fas fa-database text-gray-300 dark:text-gray-600 text-6xl mb-4"></i>
              <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Collection Selected
              </h3>
              <p class="text-gray-600 dark:text-gray-400">
                Select a collection above to browse and manage its data
              </p>
            </div>
          </div>
        </div>

        <!-- Activity Tab (Events Integration) -->
        <div v-show="activeTab === 'activity'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Persisted mutation events from nuxt-crouton-events</p>
            </div>
            <button
              @click="fetchEvents"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
              :disabled="eventsLoading"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': eventsLoading }"></i>
              Refresh
            </button>
          </div>

          <!-- Events Health Stats -->
          <div v-if="eventsHealth" class="space-y-4 mb-6">
            <!-- Main Stats Row -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ eventsHealth.totalEvents }}</p>
                  </div>
                  <i class="fas fa-history text-blue-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Today</p>
                    <p class="text-2xl font-bold text-green-600">{{ eventsHealth.todayEvents }}</p>
                  </div>
                  <i class="fas fa-calendar-day text-green-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                    <p class="text-2xl font-bold text-blue-600">{{ eventsHealth.thisWeekEvents || 0 }}</p>
                  </div>
                  <i class="fas fa-calendar-week text-blue-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p class="text-2xl font-bold" :class="getHealthStatusClass(eventsHealth.status)">
                      {{ formatHealthStatus(eventsHealth.status) }}
                    </p>
                  </div>
                  <i class="fas fa-heartbeat text-2xl" :class="getHealthStatusClass(eventsHealth.status)"></i>
                </div>
              </div>
            </div>

            <!-- Operation Breakdown Row -->
            <div v-if="eventsHealth.byOperation" class="grid grid-cols-3 md:grid-cols-6 gap-4">
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <span class="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 text-xs font-bold rounded">CREATE</span>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ eventsHealth.byOperation.create || 0 }}</span>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <span class="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 text-xs font-bold rounded">UPDATE</span>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ eventsHealth.byOperation.update || 0 }}</span>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div class="flex items-center gap-2">
                  <span class="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 px-2 py-1 text-xs font-bold rounded">DELETE</span>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ eventsHealth.byOperation.delete || 0 }}</span>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div class="text-center">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Collections</p>
                  <p class="text-lg font-bold text-purple-600">{{ eventsHealth.collectionsTracked }}</p>
                </div>
              </div>
              <div v-if="eventsHealth.oldestEvent" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 col-span-2">
                <div class="text-center">
                  <p class="text-xs text-gray-500 dark:text-gray-400">Time Range</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400 font-mono">
                    {{ formatShortDate(eventsHealth.oldestEvent) }} — {{ formatShortDate(eventsHealth.newestEvent) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Events Filters -->
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Collection</label>
                <select v-model="eventFilters.collection" @change="fetchEvents" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Collections</option>
                  <option v-for="col in eventsHealth?.collections || []" :key="col" :value="col">{{ col }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operation</label>
                <select v-model="eventFilters.operation" @change="fetchEvents" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Operations</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="delete">Delete</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Limit</label>
                <select v-model="eventFilters.limit" @change="fetchEvents" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option :value="25">25</option>
                  <option :value="50">50</option>
                  <option :value="100">100</option>
                  <option :value="200">200</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Events List -->
          <div v-if="events.length === 0 && !eventsLoading" class="text-center py-16">
            <i class="fas fa-history text-gray-300 dark:text-gray-600 text-6xl mb-6"></i>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No events yet</h3>
            <p class="text-gray-600 dark:text-gray-400">Make some mutations to see them tracked here</p>
          </div>

          <div v-else-if="eventsLoading" class="flex items-center justify-center py-16">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">Loading events...</p>
            </div>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="evt in events"
              :key="evt.id"
              @click="viewEventDetails(evt)"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1">
                  <div class="text-xs text-gray-500 dark:text-gray-400 font-mono w-20">
                    {{ formatTime(evt.timestamp) }}
                  </div>
                  <span :class="getEventOperationClass(evt.operation)" class="px-3 py-1 text-xs font-bold rounded-full uppercase">
                    {{ evt.operation }}
                  </span>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 dark:text-white">{{ evt.collectionName }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ evt.itemId }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-4">
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    <i class="fas fa-user mr-1"></i>
                    {{ evt.userName || 'Unknown' }}
                  </span>
                  <span class="text-gray-600 dark:text-gray-400 font-mono text-sm">
                    {{ evt.changes?.length || 0 }} changes
                  </span>
                  <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- Event Detail Modal -->
          <transition name="fade">
            <div v-if="selectedEvent" @click.self="closeEventDetails" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <transition name="modal">
                <div v-if="selectedEvent" @click.stop class="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                  <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between z-10">
                    <div>
                      <h2 class="text-xl font-bold text-gray-900 dark:text-white">Event Details</h2>
                      <p class="text-sm text-gray-500 dark:text-gray-400">{{ selectedEvent.id }}</p>
                    </div>
                    <button
                      @click="closeEventDetails"
                      class="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <i class="fas fa-times text-xl"></i>
                    </button>
                  </div>

                  <div class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Collection</span>
                        <span class="text-gray-900 dark:text-white font-medium">{{ selectedEvent.collectionName }}</span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Operation</span>
                        <span :class="getEventOperationClass(selectedEvent.operation)" class="inline-block px-3 py-1 text-xs font-bold rounded-full uppercase">
                          {{ selectedEvent.operation }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Item ID</span>
                        <code class="text-gray-900 dark:text-white font-mono">{{ selectedEvent.itemId }}</code>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">User</span>
                        <span class="text-gray-900 dark:text-white">{{ selectedEvent.userName || selectedEvent.userId }}</span>
                      </div>
                      <div class="col-span-2">
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Timestamp</span>
                        <span class="text-gray-900 dark:text-white font-mono text-sm">{{ formatFullTime(selectedEvent.timestamp) }}</span>
                      </div>
                    </div>

                    <div>
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Changes ({{ selectedEvent.changes?.length || 0 }})</span>
                      <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-64">
                        <table class="w-full text-sm">
                          <thead>
                            <tr class="text-left text-gray-600 dark:text-gray-400">
                              <th class="pb-2">Field</th>
                              <th class="pb-2">Old Value</th>
                              <th class="pb-2">New Value</th>
                            </tr>
                          </thead>
                          <tbody class="font-mono">
                            <tr v-for="change in selectedEvent.changes" :key="change.fieldName" class="border-t border-gray-200 dark:border-gray-700">
                              <td class="py-2 font-medium">{{ change.fieldName }}</td>
                              <td class="py-2 text-red-600 dark:text-red-400">{{ change.oldValue ? JSON.parse(change.oldValue) : '-' }}</td>
                              <td class="py-2 text-green-600 dark:text-green-400">{{ change.newValue ? JSON.parse(change.newValue) : '-' }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                    <button
                      @click="closeEventDetails"
                      class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
        </div>

        <!-- System Operations Tab (D1) -->
        <div v-show="activeTab === 'system-ops'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">System Operations</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Non-CRUD events: auth, admin, AI, email, webhooks and more</p>
            </div>
            <div class="flex gap-2">
              <button
                @click="fetchSystemOperations"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
                :disabled="systemOpsLoading"
              >
                <i class="fas fa-sync-alt" :class="{ 'fa-spin': systemOpsLoading }"></i>
                Refresh
              </button>
              <button
                @click="clearAllSystemOperations"
                class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <i class="fas fa-trash"></i>
                Clear
              </button>
            </div>
          </div>

          <!-- Stats row -->
          <div v-if="systemOpsStats" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ systemOpsStats.total }}</p>
                </div>
                <i class="fas fa-cogs text-indigo-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Types</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ Object.keys(systemOpsStats.byType || {}).length }}</p>
                </div>
                <i class="fas fa-tags text-blue-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">Sources</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ Object.keys(systemOpsStats.bySource || {}).length }}</p>
                </div>
                <i class="fas fa-layer-group text-purple-500 text-2xl"></i>
              </div>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 dark:text-gray-400">MCP</p>
                  <p class="text-2xl font-bold text-violet-600">{{ systemOperations.filter(o => o.metadata && o.metadata.mutationSource === 'mcp').length }}</p>
                </div>
                <span class="text-2xl">&#x1F916;</span>
              </div>
            </div>
          </div>

          <!-- Filters -->
          <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select v-model="sysOpsFilters.type" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Types</option>
                  <option v-for="t in uniqueSysOpsTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Package</label>
                <select v-model="sysOpsFilters.source" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Sources</option>
                  <option v-for="s in uniqueSysOpsSources" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</label>
                <select v-model="sysOpsFilters.timeRange" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">All Time</option>
                  <option value="5">Last 5 min</option>
                  <option value="15">Last 15 min</option>
                  <option value="60">Last hour</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-if="filteredSystemOperations.length === 0 && !systemOpsLoading" class="text-center py-16">
            <i class="fas fa-cogs text-gray-300 dark:text-gray-600 text-6xl mb-6"></i>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No system operations yet</h3>
            <p class="text-gray-600 dark:text-gray-400">Events emitted via the <code class="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">crouton:operation</code> hook will appear here</p>
          </div>

          <div v-else-if="systemOpsLoading" class="flex items-center justify-center py-16">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">Loading system operations...</p>
            </div>
          </div>

          <!-- Operations list -->
          <div v-else class="space-y-2">
            <div
              v-for="op in filteredSystemOperations"
              :key="op.id"
              @click="viewSystemOperationDetails(op)"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
              :class="{
                'border-l-4 border-l-violet-500 bg-violet-50 dark:bg-violet-900/10': op.metadata && op.metadata.mutationSource === 'mcp'
              }"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1">
                  <div class="text-xs text-gray-500 dark:text-gray-400 font-mono w-20">
                    {{ formatTime(op.timestamp) }}
                  </div>
                  <!-- Type badge -->
                  <span :class="getSysOpTypeBadgeClass(op.type)" class="px-2 py-1 text-xs font-bold rounded-full uppercase whitespace-nowrap">
                    {{ op.type }}
                  </span>
                  <!-- MCP badge -->
                  <span
                    v-if="op.metadata && op.metadata.mutationSource === 'mcp'"
                    class="px-2 py-0.5 text-xs font-bold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 flex items-center gap-1 whitespace-nowrap"
                    title="MCP-initiated operation"
                  >
                    <span>&#x1F916;</span> MCP
                  </span>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 dark:text-white">{{ op.source }}</div>
                    <div v-if="op.teamId" class="text-sm text-gray-500 dark:text-gray-400 font-mono">team: {{ op.teamId }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <span v-if="op.userId" class="text-xs text-gray-500 dark:text-gray-400">
                    <i class="fas fa-user mr-1"></i>{{ op.userId }}
                  </span>
                  <i class="fas fa-chevron-right text-gray-400"></i>
                </div>
              </div>
            </div>
          </div>

          <!-- System Operation Detail Modal -->
          <transition name="fade">
            <div v-if="selectedSystemOperation" @click.self="closeSystemOperationDetails" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <transition name="modal">
                <div v-if="selectedSystemOperation" @click.stop class="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl">
                  <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between z-10">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <span v-if="selectedSystemOperation.metadata && selectedSystemOperation.metadata.mutationSource === 'mcp'" class="text-xl">&#x1F916;</span>
                        <i v-else class="fas fa-cog text-indigo-600 dark:text-indigo-400"></i>
                      </div>
                      <div>
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">System Operation</h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400 font-mono">{{ selectedSystemOperation.id }}</p>
                      </div>
                    </div>
                    <button
                      @click="closeSystemOperationDetails"
                      class="w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      <i class="fas fa-times text-xl"></i>
                    </button>
                  </div>

                  <div class="p-6 space-y-4">
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Type</span>
                        <span :class="getSysOpTypeBadgeClass(selectedSystemOperation.type)" class="inline-block px-3 py-1 text-xs font-bold rounded-full uppercase">
                          {{ selectedSystemOperation.type }}
                        </span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Source</span>
                        <span class="text-gray-900 dark:text-white font-medium font-mono">{{ selectedSystemOperation.source }}</span>
                      </div>
                      <div v-if="selectedSystemOperation.teamId">
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Team ID</span>
                        <code class="text-gray-900 dark:text-white font-mono">{{ selectedSystemOperation.teamId }}</code>
                      </div>
                      <div v-if="selectedSystemOperation.userId">
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">User ID</span>
                        <code class="text-gray-900 dark:text-white font-mono">{{ selectedSystemOperation.userId }}</code>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Initiated By</span>
                        <span
                          v-if="selectedSystemOperation.metadata && selectedSystemOperation.metadata.mutationSource === 'mcp'"
                          class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300"
                        >
                          <span>&#x1F916;</span> MCP
                        </span>
                        <span v-else class="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          <i class="fas fa-user text-xs"></i> UI / API
                        </span>
                      </div>
                      <div>
                        <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Timestamp</span>
                        <span class="text-gray-900 dark:text-white font-mono text-sm">{{ formatFullTime(selectedSystemOperation.timestamp) }}</span>
                      </div>
                    </div>

                    <div v-if="selectedSystemOperation.metadata && Object.keys(selectedSystemOperation.metadata).length">
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Metadata</span>
                      <pre class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto text-xs font-mono border border-gray-200 dark:border-gray-700 max-h-64">{{ JSON.stringify(selectedSystemOperation.metadata, null, 2) }}</pre>
                    </div>

                    <div>
                      <span class="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Full Data (JSON)</span>
                      <pre class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 overflow-auto text-xs font-mono border border-gray-200 dark:border-gray-700">{{ JSON.stringify(selectedSystemOperation, null, 2) }}</pre>
                    </div>
                  </div>

                  <div class="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end">
                    <button
                      @click="closeSystemOperationDetails"
                      class="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
        </div>

        <!-- Generators Tab (D3) -->
        <div v-show="activeTab === 'generators'">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Generator History</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Timeline of collection generation runs via <code class="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">crouton generate</code></p>
            </div>
            <button
              @click="fetchGenerationHistory"
              class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2"
              :disabled="generationHistoryLoading"
            >
              <i class="fas fa-sync-alt" :class="{ 'fa-spin': generationHistoryLoading }"></i>
              Refresh
            </button>
          </div>

          <!-- Loading -->
          <div v-if="generationHistoryLoading" class="flex items-center justify-center py-16">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary-600 mx-auto mb-4"></div>
              <p class="text-gray-600 dark:text-gray-400">Loading generation history...</p>
            </div>
          </div>

          <!-- Empty state: history file not found -->
          <div v-else-if="!generationHistoryLoading && !generationHistoryFound && generationHistory.length === 0" class="text-center py-20">
            <div class="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <i class="fas fa-code-branch text-gray-400 dark:text-gray-500 text-3xl"></i>
            </div>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-3">No generation history yet</h3>
            <p class="text-gray-600 dark:text-gray-400 mb-2">Run <code class="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">crouton generate</code> to get started.</p>
            <p class="text-sm text-gray-500 dark:text-gray-500">History is stored in <code class="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">.crouton-generation-history.json</code></p>
          </div>

          <!-- Timeline -->
          <div v-else class="space-y-3">
            <!-- Summary stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Total Runs</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ generationHistory.length }}</p>
                  </div>
                  <i class="fas fa-history text-sky-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Collections</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ new Set(generationHistory.map(h => h.collection)).size }}</p>
                  </div>
                  <i class="fas fa-layer-group text-emerald-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Layers</p>
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ new Set(generationHistory.map(h => h.layer).filter(Boolean)).size }}</p>
                  </div>
                  <i class="fas fa-cubes text-orange-500 text-2xl"></i>
                </div>
              </div>
              <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Latest</p>
                    <p class="text-sm font-semibold text-gray-900 dark:text-white mt-1">{{ generationHistory[0] ? formatRelativeTime(generationHistory[0].timestamp) : '-' }}</p>
                  </div>
                  <i class="fas fa-clock text-violet-500 text-2xl"></i>
                </div>
              </div>
            </div>

            <!-- History list -->
            <div
              v-for="(entry, index) in generationHistory"
              :key="entry.timestamp + index"
              class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-all"
            >
              <div class="flex items-start gap-4">
                <!-- Timeline dot -->
                <div class="flex flex-col items-center pt-1">
                  <div class="w-3 h-3 rounded-full bg-sky-500 flex-shrink-0"></div>
                  <div v-if="index < generationHistory.length - 1" class="w-0.5 bg-gray-200 dark:bg-gray-700 flex-grow mt-1" style="min-height: 24px;"></div>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-2">
                    <!-- Collection name -->
                    <span class="font-semibold text-gray-900 dark:text-white">{{ entry.collection }}</span>

                    <!-- Layer badge -->
                    <span v-if="entry.layer" :class="getLayerColorClass(entry.layer)" class="px-2 py-0.5 text-xs font-medium rounded-full">
                      {{ entry.layer }}
                    </span>

                    <!-- Generator badge -->
                    <span :class="getGeneratorBadgeClass(entry.generator)" class="px-2 py-0.5 text-xs font-bold rounded-full uppercase">
                      {{ entry.generator }}
                    </span>

                    <!-- Git SHA -->
                    <code v-if="entry.gitSha" class="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {{ entry.gitSha }}
                    </code>
                  </div>

                  <div class="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <!-- Timestamp -->
                    <span class="flex items-center gap-1.5" :title="entry.timestamp">
                      <i class="fas fa-clock text-xs"></i>
                      {{ formatRelativeTime(entry.timestamp) }}
                    </span>

                    <!-- Field count -->
                    <span class="flex items-center gap-1.5">
                      <i class="fas fa-list text-xs"></i>
                      {{ (entry.fields || []).length }} field{{ (entry.fields || []).length !== 1 ? 's' : '' }}
                    </span>
                  </div>

                  <!-- Field pills -->
                  <div v-if="entry.fields && entry.fields.length > 0" class="flex flex-wrap gap-1.5 mt-2">
                    <span
                      v-for="field in entry.fields"
                      :key="field"
                      class="px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                    >
                      {{ field }}
                    </span>
                  </div>
                </div>

                <!-- Right: full timestamp -->
                <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap font-mono flex-shrink-0">
                  {{ formatShortDate(entry.timestamp) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
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
  </script>

  <script>
    // Tailwind config
    tailwind.config = {
      darkMode: 'media',
      theme: {
        extend: {
          colors: {
            primary: {
              50: '#f0f9ff',
              100: '#e0f2fe',
              200: '#bae6fd',
              300: '#7dd3fc',
              400: '#38bdf8',
              500: '#0ea5e9',
              600: '#0284c7',
              700: '#0369a1',
              800: '#075985',
              900: '#0c4a6e',
            }
          }
        }
      }
    }
  </script>
</body>
</html>`

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  return HTML_CONTENT
})
