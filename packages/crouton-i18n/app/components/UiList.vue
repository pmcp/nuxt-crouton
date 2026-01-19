<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          UI Translations
        </h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          System translations with team overrides
        </p>
      </div>
    </div>

    <!-- Search/Filter -->
    <div class="flex gap-4">
      <UInput
        v-model="search"
        placeholder="Search translations..."
        icon="i-lucide-search"
        class="w-64"
      />
      <USelect
        v-model="categoryFilter"
        :items="categories"
        placeholder="All categories"
        class="w-48"
      />
    </div>

    <!-- Loading state -->
    <div
      v-if="pending"
      class="flex justify-center py-8"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="w-6 h-6 animate-spin text-gray-400"
      />
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="error"
      color="red"
      icon="i-lucide-alert-circle"
      title="Failed to load translations"
      :description="error.message"
    />

    <!-- Translations table -->
    <UTable
      v-else
      :data="filteredItems"
      :columns="columns"
      :empty="{ icon: 'i-lucide-languages', label: 'No translations found' }"
    >
      <!-- Key Path -->
      <template #keyPath-cell="{ row }">
        <code class="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
          {{ row.original.keyPath }}
        </code>
      </template>

      <!-- Category -->
      <template #category-cell="{ row }">
        <UBadge
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ row.original.category }}
        </UBadge>
      </template>

      <!-- System Values -->
      <template #systemValues-cell="{ row }">
        <span class="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {{ row.original.systemValues?.en || '—' }}
        </span>
      </template>

      <!-- Team Override -->
      <template #teamValues-cell="{ row }">
        <template v-if="row.original.hasOverride">
          <span class="text-sm text-primary line-clamp-2">
            {{ row.original.teamValues?.en || '—' }}
          </span>
        </template>
        <span
          v-else
          class="text-gray-400 text-sm italic"
        >—</span>
      </template>

      <!-- Status -->
      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.hasOverride ? 'green' : 'blue'"
          variant="subtle"
          size="sm"
        >
          {{ row.original.hasOverride ? 'Overridden' : 'System' }}
        </UBadge>
      </template>

      <!-- Actions -->
      <template #actions-cell="{ row }">
        <div class="flex gap-1">
          <UButton
            icon="i-lucide-pencil"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="openOverrideModal(row.original)"
          />
          <UButton
            v-if="row.original.hasOverride"
            icon="i-lucide-trash-2"
            size="xs"
            color="red"
            variant="ghost"
            @click="deleteOverride(row.original)"
          />
        </div>
      </template>
    </UTable>

    <!-- Override Modal -->
    <UModal v-model:open="showModal">
      <template #content>
        <div class="p-6 space-y-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ editingItem?.hasOverride ? 'Edit Override' : 'Create Override' }}
          </h3>

          <div class="space-y-1">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Key Path</label>
            <code class="block text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {{ editingItem?.keyPath }}
            </code>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">System Values</label>
            <div
              v-if="editingItem"
              class="space-y-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3"
            >
              <div
                v-for="locale in locales"
                :key="locale"
                class="flex gap-2"
              >
                <span class="w-8 text-xs font-medium text-gray-500 uppercase shrink-0 pt-0.5">{{ locale }}</span>
                <span class="text-sm text-gray-700 dark:text-gray-300">
                  {{ editingItem.systemValues?.[locale] || '—' }}
                </span>
              </div>
            </div>
          </div>

          <USeparator />

          <div class="space-y-3">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Team Override Values</label>
            <div
              v-for="locale in locales"
              :key="locale"
              class="flex items-center gap-2"
            >
              <span class="w-8 text-xs font-medium text-gray-500 uppercase">{{ locale }}</span>
              <UInput
                v-model="overrideValues[locale]"
                :placeholder="editingItem?.systemValues?.[locale] || ''"
                class="flex-1"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="saveOverride"
            >
              {{ editingItem?.hasOverride ? 'Update' : 'Create' }} Override
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
interface TranslationWithOverride {
  keyPath: string
  category: string
  namespace: string
  systemValues: Record<string, string>
  systemId: string
  isOverrideable: boolean
  teamValues: Record<string, string> | null
  hasOverride: boolean
  overrideId: string | null
  overrideDescription: string | null
  overrideUpdatedAt: Date | null
}

const route = useRoute()
const toast = useToast()
const teamSlug = computed(() => route.params.team as string)

// Fetch system translations with team overrides
const { data: items, pending, error, refresh } = await useFetch<TranslationWithOverride[]>(
  () => `/api/teams/${teamSlug.value}/translations-ui/with-system`,
  { watch: [teamSlug] }
)

// Table columns
const columns = [
  { accessorKey: 'keyPath', header: 'Key' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'systemValues', header: 'Value (EN)' },
  { accessorKey: 'teamValues', header: 'Override' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'actions', header: '' }
]

// Locales for override form
const locales = ['en', 'nl', 'fr']

// Search and filter
const search = ref('')
const categoryFilter = ref<string | undefined>(undefined)

const categories = computed(() => {
  if (!items.value) return []
  const cats = [...new Set(items.value.map(i => i.category))]
  return [{ label: 'All categories', value: undefined }, ...cats.map(c => ({ label: c, value: c }))]
})

const filteredItems = computed(() => {
  if (!items.value) return []
  return items.value.filter((item) => {
    const matchesSearch = !search.value
      || item.keyPath.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value
    return matchesSearch && matchesCategory
  })
})

// Modal state
const showModal = ref(false)
const editingItem = ref<TranslationWithOverride | null>(null)
const overrideValues = ref<Record<string, string>>({})

function openOverrideModal(item: TranslationWithOverride) {
  editingItem.value = item
  // Pre-fill with existing team values or empty
  overrideValues.value = { ...item.teamValues } || {}
  showModal.value = true
}

async function saveOverride() {
  if (!editingItem.value) return

  // Filter out empty values
  const values = Object.fromEntries(
    Object.entries(overrideValues.value).filter(([, v]) => v && v.trim())
  )

  if (Object.keys(values).length === 0) {
    toast.add({ title: 'At least one translation value is required', color: 'warning' })
    return
  }

  try {
    if (editingItem.value.hasOverride && editingItem.value.overrideId) {
      // Update existing override
      await $fetch(`/api/teams/${teamSlug.value}/translations-ui/${editingItem.value.overrideId}`, {
        method: 'PATCH',
        body: { values }
      })
      toast.add({ title: 'Override updated', color: 'success' })
    } else {
      // Create new override
      await $fetch(`/api/teams/${teamSlug.value}/translations-ui`, {
        method: 'POST',
        body: {
          keyPath: editingItem.value.keyPath,
          category: editingItem.value.category,
          namespace: editingItem.value.namespace,
          values
        }
      })
      toast.add({ title: 'Override created', color: 'success' })
    }

    showModal.value = false
    await refresh()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to save override'
    toast.add({ title: errorMessage, color: 'error' })
  }
}

async function deleteOverride(item: TranslationWithOverride) {
  if (!item.overrideId) return

  try {
    await $fetch(`/api/teams/${teamSlug.value}/translations-ui/${item.overrideId}`, {
      method: 'DELETE'
    })
    toast.add({ title: 'Override removed', color: 'success' })
    await refresh()
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to delete override'
    toast.add({ title: errorMessage, color: 'error' })
  }
}
</script>
