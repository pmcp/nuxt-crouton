<template>
  <!-- Table Layout -->
  <CroutonTable
    v-if="activeLayout === 'table'"
    :collection="collection"
    :columns="columns"
    :rows="rows"
    :server-pagination="serverPagination"
    :pagination-data="paginationData"
    :refresh-fn="refreshFn"
    :hide-default-columns="hideDefaultColumns"
  >
    <template #header>
      <slot name="header" />
    </template>

    <!-- Pass through all data slots -->
    <template v-for="(_, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </CroutonTable>

  <!-- List Layout -->
  <UDashboardPanel v-else-if="activeLayout === 'list'" :id="collection || 'crouton-list'">
    <template #header>
      <slot name="header" />
    </template>

    <template #body>
      <ul role="list" class="divide-y divide-default">
        <li
          v-for="(row, index) in rows"
          :key="row.id || index"
          class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6 hover:bg-muted/50 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Avatar if applicable -->
            <UAvatar
              v-if="getListItemAvatar(row)"
              v-bind="getListItemAvatar(row)"
              size="md"
            />

            <div v-else class="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <UIcon name="i-lucide-user" class="w-5 h-5 text-muted-foreground" />
            </div>

            <div class="text-sm min-w-0">
              <p class="text-highlighted font-medium truncate">
                {{ getListItemTitle(row) }}
              </p>
              <p class="text-muted truncate">
                {{ getListItemSubtitle(row) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Custom slot for list item actions -->
            <slot name="list-item-actions" :row="row">
              <!-- Default actions -->
              <CroutonMiniButtons
                  delete
                  @delete="openCrouton('delete', collection, [row.id])"
                  :delete-loading="row.optimisticAction === 'delete'"
                  update
                  @update="openCrouton('update', collection, [row.id])"
              />


            </slot>
          </div>
        </li>
      </ul>

      <!-- Pagination -->
      <div v-if="serverPagination && paginationData" class="p-4 border-t border-default">
        <CroutonTablePagination
          :page="paginationData.currentPage"
          :page-count="paginationData.totalPages || Math.ceil(paginationData.totalItems / paginationData.pageSize)"
          :total-items="paginationData.totalItems"
        />
      </div>
    </template>
  </UDashboardPanel>

  <!-- Grid Layout - Placeholder -->
  <div v-else-if="activeLayout === 'grid'">
    <!-- Grid layout to be implemented -->
    <p class="p-4 text-muted">Grid layout coming soon</p>
  </div>

  <!-- Cards Layout - Placeholder -->
  <div v-else-if="activeLayout === 'cards'">
    <!-- Cards layout to be implemented -->
    <p class="p-4 text-muted">Cards layout coming soon</p>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import type { ListProps, LayoutType, ResponsiveLayout, layoutPresets } from '../types/table'
import { layoutPresets as presets } from '../types/table'

const props = withDefaults(defineProps<ListProps>(), {
  layout: 'table',
  columns: () => [],
  rows: () => [],
  collection: '',
  serverPagination: false,
  paginationData: null,
  refreshFn: undefined,
  hideDefaultColumns: () => ({
    created_at: false,
    updated_at: false,
    actions: false
  })
})

// Responsive breakpoint detection
const breakpoints = useBreakpoints(breakpointsTailwind)

// Normalize layout prop to ResponsiveLayout format
const normalizedLayout = computed<ResponsiveLayout>(() => {
  const { layout } = props

  // If it's a preset name, use the preset
  if (typeof layout === 'string' && layout in presets) {
    return presets[layout as keyof typeof presets]
  }

  // If it's a simple string layout, apply to all breakpoints
  if (typeof layout === 'string') {
    return { base: layout as LayoutType }
  }

  // If it's already a responsive layout object, use it
  if (layout && typeof layout === 'object') {
    return layout as ResponsiveLayout
  }

  // Default fallback
  return { base: 'table' }
})

// Determine active layout based on current breakpoint
const activeLayout = computed<LayoutType>(() => {
  const layout = normalizedLayout.value

  // Check breakpoints from largest to smallest
  if (breakpoints['2xl'].value && layout['2xl']) return layout['2xl']
  if (breakpoints.xl.value && layout.xl) return layout.xl
  if (breakpoints.lg.value && layout.lg) return layout.lg
  if (breakpoints.md.value && layout.md) return layout.md
  if (breakpoints.sm.value && layout.sm) return layout.sm

  return layout.base
})

// Helper functions for list layout
const getListItemTitle = (row: any) => {
  // Try common fields for title
  return row.name || row.title || row.label || row.email || row.username || row.id || 'Untitled'
}

const getListItemSubtitle = (row: any) => {
  // Try common fields for subtitle
  if (row.description) return row.description
  if (row.email && row.name) return row.email
  if (row.username && row.name) return row.username
  if (row.role) return row.role
  if (row.createdAt) return new Date(row.createdAt).toLocaleDateString()
  return ''
}

const getListItemAvatar = (row: any) => {
  // Return avatar props if applicable
  if (row.avatar) return row.avatar
  if (row.image) return { src: row.image }
  if (row.avatarUrl) return { src: row.avatarUrl }
  if (row.profileImage) return { src: row.profileImage }
  return null
}

// Crouton actions (matching table functionality)
const { open: openCrouton } = useCrouton()
</script>