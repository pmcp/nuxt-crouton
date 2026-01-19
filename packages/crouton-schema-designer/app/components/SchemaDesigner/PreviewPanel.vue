<script setup lang="ts">
const { state } = useSchemaDesigner()
const { generateMockRows, generateColumns } = useMockData()
const { compiledComponent: cardComponent, compilationError } = useCompiledCard()

type LayoutType = 'table' | 'list' | 'grid' | 'cards' | 'form'
const currentLayout = ref<LayoutType>('table')

// Form mode: create or edit
const formMode = ref<'create' | 'edit'>('edit')

const layouts: { value: LayoutType; label: string; icon: string }[] = [
  { value: 'table', label: 'Table', icon: 'i-lucide-table' },
  { value: 'list', label: 'List', icon: 'i-lucide-list' },
  { value: 'grid', label: 'Grid', icon: 'i-lucide-layout-grid' },
  { value: 'cards', label: 'Cards', icon: 'i-lucide-square' },
  { value: 'form', label: 'Form', icon: 'i-lucide-form-input' }
]

// Generate mock data reactively
const mockRows = computed(() => {
  if (state.value.fields.length === 0) return []
  return generateMockRows(state.value.fields, 5)
})

const columns = computed(() => {
  return generateColumns(state.value.fields)
})

const hasValidFields = computed(() => {
  return state.value.fields.some(f => f.name)
})

// Refresh mock data
const refreshKey = ref(0)
function refreshData() {
  refreshKey.value++
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-[var(--ui-border)] flex items-center justify-between">
      <h2 class="font-semibold">Preview</h2>
      <div class="flex items-center gap-2">
        <!-- Form mode toggle (only shown for form layout) -->
        <UFieldGroup v-if="currentLayout === 'form'" size="xs">
          <UButton
            :variant="formMode === 'create' ? 'solid' : 'ghost'"
            size="xs"
            @click="formMode = 'create'"
          >
            Create
          </UButton>
          <UButton
            :variant="formMode === 'edit' ? 'solid' : 'ghost'"
            size="xs"
            @click="formMode = 'edit'"
          >
            Edit
          </UButton>
        </UFieldGroup>

        <USeparator v-if="currentLayout === 'form'" orientation="vertical" class="h-4" />

        <UFieldGroup size="xs">
          <UButton
            v-for="layout in layouts"
            :key="layout.value"
            :variant="currentLayout === layout.value ? 'solid' : 'ghost'"
            :icon="layout.icon"
            @click="currentLayout = layout.value"
          />
        </UFieldGroup>
        <UButton
          v-if="currentLayout !== 'form'"
          variant="ghost"
          color="neutral"
          size="xs"
          icon="i-lucide-refresh-cw"
          @click="refreshData"
        />
      </div>
    </div>

    <!-- Compilation Error Banner -->
    <div
      v-if="compilationError"
      class="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
    >
      <div class="flex items-start gap-2">
        <UIcon name="i-lucide-alert-circle" class="text-red-500 mt-0.5 shrink-0" />
        <div class="text-sm">
          <div class="font-medium text-red-600 dark:text-red-400">Template Error</div>
          <code class="text-xs text-[var(--ui-text-muted)] break-all">{{ compilationError }}</code>
        </div>
      </div>
    </div>

    <!-- Preview Content -->
    <div class="flex-1 overflow-auto" :key="refreshKey">
      <template v-if="hasValidFields">
        <!-- Form Preview -->
        <CroutonSchemaDesignerFormPreview
          v-if="currentLayout === 'form'"
          :fields="state.fields"
          :mode="formMode"
        />

        <!-- Use CroutonCollection in stateless mode for other layouts -->
        <CroutonCollection
          v-else
          :columns="columns"
          :rows="mockRows"
          :layout="currentLayout"
          :collection="state.collectionName || 'preview'"
          :card-component="cardComponent"
          stateless
        />
      </template>

      <!-- Empty State -->
      <div
        v-else
        class="h-full flex items-center justify-center text-center text-[var(--ui-text-muted)]"
      >
        <div>
          <UIcon name="i-lucide-eye-off" class="text-3xl mb-2" />
          <p class="text-sm">Add fields to see a preview</p>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="p-3 border-t border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)]">
      <div class="flex items-center justify-between">
        <span v-if="currentLayout === 'form'">
          {{ formMode === 'create' ? 'Create' : 'Edit' }} form with {{ state.fields.filter(f => f.name).length }} fields
        </span>
        <span v-else>
          Showing {{ mockRows.length }} mock records
        </span>
        <span v-if="state.collectionName">
          {{ state.layerName }}/{{ state.collectionName }}
        </span>
      </div>
    </div>
  </div>
</template>
