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
      <slot name="header">
        <CroutonTableHeader
          v-if="create"
          :collection="collection"
          :create-button="create"
        />
      </slot>
    </template>

    <!-- Pass through all data slots -->
    <template v-for="(_, slot) of $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope" />
    </template>
  </CroutonTable>

  <!-- List Layout -->
  <UDashboardPanel v-else-if="activeLayout === 'list'" :id="collection || 'crouton-list'">
    <template #header>
      <slot name="header">
        <div v-if="create" class="flex items-center justify-end px-4 py-2 border-b border-default">
          <UButton
            color="primary"
            size="xs"
            @click="openCrouton('create', collection)"
          >
            Create
          </UButton>
        </div>
      </slot>
    </template>

    <template #body>
      <ul v-if="customCardComponent && rows && rows.length > 0" role="list" class="divide-y divide-default">
        <li
          v-for="(row, index) in rows"
          :key="row.id || index"
          class="py-3 px-4 sm:px-6 hover:bg-muted/50 transition-colors"
        >
          <component
            :is="customCardComponent"
            :item="row"
            :layout="'list'"
            :collection="collection"
          />
        </li>
      </ul>

      <div v-else class="text-center text-muted p-8">
        <p class="text-lg font-medium mb-2">Create Card.vue for list layout</p>
        <code class="text-xs bg-muted/30 px-2 py-1 rounded">
          layers/{layer}/collections/{{ collection }}/app/components/Card.vue
        </code>
        <p class="text-sm mt-4">Example Card.vue structure:</p>
        <pre class="text-left text-xs bg-muted/20 p-4 rounded mt-2 max-w-md mx-auto overflow-auto">
&lt;script setup lang="ts"&gt;
interface Props {
  item: any
  layout: 'list' | 'grid' | 'cards'
  collection: string
}
defineProps&lt;Props&gt;()
&lt;/script&gt;

&lt;template&gt;
  &lt;div v-if="layout === 'list'"&gt;
    {{ item.name }}
  &lt;/div&gt;
&lt;/template&gt;</pre>
      </div>

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

  <!-- Grid Layout -->
  <div v-else-if="activeLayout === 'grid'">
    <div v-if="create" class="flex items-center justify-end px-4 py-2 border-b border-default">
      <UButton
        color="primary"
        size="xs"
        @click="openCrouton('create', collection)"
      >
        Create
      </UButton>
    </div>

    <div v-if="customCardComponent && rows && rows.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      <component
        v-for="(row, index) in rows"
        :key="row.id || index"
        :is="customCardComponent"
        :item="row"
        :layout="'grid'"
        :collection="collection"
      />
    </div>

    <div v-else class="text-center text-muted p-8">
      <p class="text-lg font-medium mb-2">Create Card.vue for grid layout</p>
      <code class="text-xs bg-muted/30 px-2 py-1 rounded">
        layers/{layer}/collections/{{ collection }}/app/components/Card.vue
      </code>
      <p class="text-sm mt-4">Example Card.vue with grid layout:</p>
      <pre class="text-left text-xs bg-muted/20 p-4 rounded mt-2 max-w-md mx-auto overflow-auto">
&lt;template&gt;
  &lt;UCard v-if="layout === 'grid'" class="hover:shadow-lg"&gt;
    &lt;template #header&gt;
      &lt;h3&gt;{{ item.title }}&lt;/h3&gt;
    &lt;/template&gt;
    {{ item.description }}
  &lt;/UCard&gt;
&lt;/template&gt;</pre>
    </div>

    <!-- Pagination -->
    <div v-if="serverPagination && paginationData" class="p-4 border-t border-default">
      <CroutonTablePagination
        :page="paginationData.currentPage"
        :page-count="paginationData.totalPages || Math.ceil(paginationData.totalItems / paginationData.pageSize)"
        :total-items="paginationData.totalItems"
      />
    </div>
  </div>

  <!-- Cards Layout -->
  <div v-else-if="activeLayout === 'cards'">
    <div v-if="create" class="flex items-center justify-end px-4 py-2 border-b border-default">
      <UButton
        color="primary"
        size="xs"
        @click="openCrouton('create', collection)"
      >
        Create
      </UButton>
    </div>

    <div v-if="customCardComponent && rows && rows.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      <component
        v-for="(row, index) in rows"
        :key="row.id || index"
        :is="customCardComponent"
        :item="row"
        :layout="'cards'"
        :collection="collection"
      />
    </div>

    <div v-else class="text-center text-muted p-8">
      <p class="text-lg font-medium mb-2">Create Card.vue for cards layout</p>
      <code class="text-xs bg-muted/30 px-2 py-1 rounded">
        layers/{layer}/collections/{{ collection }}/app/components/Card.vue
      </code>
      <p class="text-sm mt-4">Example Card.vue with detailed cards layout:</p>
      <pre class="text-left text-xs bg-muted/20 p-4 rounded mt-2 max-w-md mx-auto overflow-auto">
&lt;template&gt;
  &lt;UCard v-if="layout === 'cards'" class="hover:shadow-xl"&gt;
    &lt;template #header&gt;
      &lt;h3 class="text-lg"&gt;{{ item.title }}&lt;/h3&gt;
    &lt;/template&gt;
    &lt;div class="space-y-2"&gt;
      &lt;p&gt;{{ item.description }}&lt;/p&gt;
      &lt;!-- More detailed content --&gt;
    &lt;/div&gt;
  &lt;/UCard&gt;
&lt;/template&gt;</pre>
    </div>

    <!-- Pagination -->
    <div v-if="serverPagination && paginationData" class="p-4 border-t border-default">
      <CroutonTablePagination
        :page="paginationData.currentPage"
        :page-count="paginationData.totalPages || Math.ceil(paginationData.totalItems / paginationData.pageSize)"
        :total-items="paginationData.totalItems"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, resolveComponent } from 'vue'
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
  create: false,
  hideDefaultColumns: () => ({
    created_at: false,
    updated_at: false,
    updatedBy: false,
    actions: false
  })
})

// Card component resolution
const { toPascalCase } = useFormatCollections()

const getCardComponent = (collectionName: string) => {
  try {
    const pascalName = toPascalCase(collectionName)
    const component = resolveComponent(`${pascalName}Card`)
    // resolveComponent returns a string when component is not found
    // Only return the component if it's an actual component object
    return typeof component === 'string' ? null : component
  } catch {
    return null
  }
}

const customCardComponent = computed(() =>
  props.collection ? getCardComponent(props.collection) : null
)

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

// Crouton actions
const { open: openCrouton } = useCrouton()
</script>