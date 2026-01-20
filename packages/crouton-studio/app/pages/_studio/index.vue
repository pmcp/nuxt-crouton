<script setup lang="ts">
import type { FieldInfo } from '../types/studio'

definePageMeta({
  layout: false
})

const { scan, loading, error, context, layers, collections, components, pages, collectionsByLayer, totalFields, totalEndpoints, croutonPackages, localLayers } = useAppScanner()

// Scan on mount
onMounted(() => {
  scan()
})

// Track expanded sections
const expandedSections = ref<Record<string, boolean>>({
  layers: true,
  collections: true,
  components: false,
  pages: false
})

function toggleSection(section: string) {
  expandedSections.value[section] = !expandedSections.value[section]
}

// Filter out auto-generated fields for display
function getUserFields(fields: FieldInfo[]): FieldInfo[] {
  return fields.filter(f => !f.auto)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
              <span class="text-white text-xl">🍞</span>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                Crouton Studio
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                AI-powered app builder
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <UButton
              color="primary"
              variant="soft"
              :loading="loading"
              icon="i-heroicons-arrow-path"
              @click="scan"
            >
              Scan App
            </UButton>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Error state -->
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-heroicons-exclamation-triangle"
        title="Scan Error"
        :description="error.message"
        class="mb-6"
      />

      <!-- Loading state -->
      <div v-if="loading && !context" class="flex items-center justify-center py-12">
        <div class="text-center">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p class="text-gray-500 dark:text-gray-400">Scanning app structure...</p>
        </div>
      </div>

      <!-- Main content -->
      <div v-else-if="context" class="space-y-6">
        <!-- Stats grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ layers.length }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Layers
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ collections.length }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Collections
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ totalFields }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Fields
            </div>
          </div>
          <div class="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div class="text-2xl font-bold text-gray-900 dark:text-white">
              {{ totalEndpoints }}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              API Endpoints
            </div>
          </div>
        </div>

        <!-- Layers section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            @click="toggleSection('layers')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-square-3-stack-3d" class="w-5 h-5 text-gray-400" />
              <span class="font-medium text-gray-900 dark:text-white">Layers</span>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ layers.length }}
              </UBadge>
            </div>
            <UIcon
              :name="expandedSections.layers ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-5 h-5 text-gray-400"
            />
          </button>

          <div v-if="expandedSections.layers" class="px-6 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div v-if="layers.length === 0" class="py-4 text-gray-500 dark:text-gray-400 text-sm">
              No layers found
            </div>
            <div v-else class="divide-y divide-gray-100 dark:divide-gray-700">
              <!-- Crouton packages -->
              <div v-if="croutonPackages.length > 0" class="py-3">
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Crouton Packages
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="layer in croutonPackages"
                    :key="layer.name"
                    color="primary"
                    variant="soft"
                    size="sm"
                  >
                    {{ layer.name }}
                  </UBadge>
                </div>
              </div>

              <!-- Local layers -->
              <div v-if="localLayers.length > 0" class="py-3">
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Local Layers
                </div>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="layer in localLayers"
                    :key="layer.name"
                    color="success"
                    variant="soft"
                    size="sm"
                  >
                    {{ layer.name }}
                  </UBadge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Collections section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            @click="toggleSection('collections')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-table-cells" class="w-5 h-5 text-gray-400" />
              <span class="font-medium text-gray-900 dark:text-white">Collections</span>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ collections.length }}
              </UBadge>
            </div>
            <UIcon
              :name="expandedSections.collections ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-5 h-5 text-gray-400"
            />
          </button>

          <div v-if="expandedSections.collections" class="px-6 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div v-if="collections.length === 0" class="py-4 text-gray-500 dark:text-gray-400 text-sm">
              No collections found. Create one using the chat!
            </div>
            <div v-else class="space-y-4 pt-3">
              <!-- Group by layer -->
              <div
                v-for="(layerCollections, layerName) in collectionsByLayer"
                :key="layerName"
              >
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {{ layerName }}
                </div>
                <div class="grid gap-3">
                  <div
                    v-for="collection in layerCollections"
                    :key="collection.name"
                    class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4"
                  >
                    <div class="flex items-start justify-between mb-2">
                      <div class="font-medium text-gray-900 dark:text-white">
                        {{ collection.name }}
                      </div>
                      <div class="flex items-center gap-2">
                        <UBadge
                          v-if="collection.components.length > 0"
                          color="primary"
                          variant="subtle"
                          size="xs"
                        >
                          {{ collection.components.length }} components
                        </UBadge>
                        <UBadge
                          v-if="collection.apiEndpoints.length > 0"
                          color="success"
                          variant="subtle"
                          size="xs"
                        >
                          {{ collection.apiEndpoints.length }} endpoints
                        </UBadge>
                      </div>
                    </div>

                    <!-- Fields -->
                    <div v-if="collection.fields.length > 0" class="flex flex-wrap gap-1.5">
                      <span
                        v-for="field in getUserFields(collection.fields)"
                        :key="field.name"
                        class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500"
                      >
                        {{ field.name }}
                        <span class="ml-1 text-gray-400 dark:text-gray-500">{{ field.type }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Components section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            @click="toggleSection('components')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-cube" class="w-5 h-5 text-gray-400" />
              <span class="font-medium text-gray-900 dark:text-white">App Components</span>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ components.length }}
              </UBadge>
            </div>
            <UIcon
              :name="expandedSections.components ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-5 h-5 text-gray-400"
            />
          </button>

          <div v-if="expandedSections.components" class="px-6 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div v-if="components.length === 0" class="py-4 text-gray-500 dark:text-gray-400 text-sm">
              No app-level components found
            </div>
            <div v-else class="flex flex-wrap gap-2 pt-3">
              <div
                v-for="component in components"
                :key="component.path"
                class="px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300"
              >
                {{ component.name }}
              </div>
            </div>
          </div>
        </div>

        <!-- Pages section -->
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            class="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            @click="toggleSection('pages')"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-heroicons-document-text" class="w-5 h-5 text-gray-400" />
              <span class="font-medium text-gray-900 dark:text-white">App Pages</span>
              <UBadge color="neutral" variant="soft" size="sm">
                {{ pages.length }}
              </UBadge>
            </div>
            <UIcon
              :name="expandedSections.pages ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'"
              class="w-5 h-5 text-gray-400"
            />
          </button>

          <div v-if="expandedSections.pages" class="px-6 pb-4 border-t border-gray-100 dark:border-gray-700">
            <div v-if="pages.length === 0" class="py-4 text-gray-500 dark:text-gray-400 text-sm">
              No app-level pages found
            </div>
            <div v-else class="space-y-2 pt-3">
              <div
                v-for="page in pages"
                :key="page.path"
                class="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <span class="text-sm text-gray-700 dark:text-gray-300">{{ page.name }}</span>
                <code class="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded">
                  {{ page.route }}
                </code>
              </div>
            </div>
          </div>
        </div>

        <!-- Scan info -->
        <div class="text-center text-sm text-gray-400 dark:text-gray-500">
          Last scanned: {{ context.scannedAt.toLocaleTimeString() }}
        </div>
      </div>

      <!-- Empty state before first scan -->
      <div v-else class="text-center py-12">
        <div class="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <UIcon name="i-heroicons-magnifying-glass" class="w-8 h-8 text-gray-400" />
        </div>
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          No app data yet
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mb-4">
          Click "Scan App" to discover your app's structure
        </p>
        <UButton color="primary" @click="scan">
          Scan App
        </UButton>
      </div>
    </main>
  </div>
</template>
