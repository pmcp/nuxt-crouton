<script setup lang="ts">
/**
 * TeamList Component
 *
 * Paginated team/organization table with search and member counts.
 */
import { ref, watch, onMounted } from 'vue'
import type { TeamListFilters } from '../../../types/admin'

interface Props {
  /** Initial page size */
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20
})

const {
  teams,
  total,
  page,
  totalPages,
  loading,
  error,
  getTeams
} = useAdminTeams()

// Filter state
const search = ref('')
const personalFilter = ref<'all' | 'personal' | 'team'>('all')

// Table columns
const columns = [
  { accessorKey: 'name', id: 'name', header: 'Name' },
  { accessorKey: 'slug', id: 'slug', header: 'Slug' },
  { accessorKey: 'ownerName', id: 'owner', header: 'Owner' },
  { accessorKey: 'memberCount', id: 'memberCount', header: 'Members' },
  { accessorKey: 'personal', id: 'type', header: 'Type' },
  { accessorKey: 'createdAt', id: 'createdAt', header: 'Created' }
]

// Load teams on mount and when filters change
async function loadTeams(pageNum = 1) {
  const filters: TeamListFilters = {
    page: pageNum,
    pageSize: props.pageSize,
    search: search.value || undefined,
    personal: personalFilter.value === 'all' ? undefined : personalFilter.value === 'personal'
  }
  await getTeams(filters)
}

// Debounced search
const debouncedSearch = useDebounceFn(() => {
  loadTeams(1)
}, 300)

watch(search, () => {
  debouncedSearch()
})

watch(personalFilter, () => {
  loadTeams(1)
})

onMounted(() => {
  loadTeams()
})

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header with search and filters -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
      <UInput
        v-model="search"
        placeholder="Search teams..."
        icon="i-heroicons-magnifying-glass"
        class="max-w-xs"
      />
      <USelect
        v-model="personalFilter"
        :items="[
          { value: 'all', label: 'All Teams' },
          { value: 'team', label: 'Team Workspaces' },
          { value: 'personal', label: 'Personal Workspaces' }
        ]"
        value-key="value"
        class="w-44"
      />
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
    />

    <!-- Table -->
    <UTable
      :columns="columns"
      :rows="teams"
      :loading="loading"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar
            :src="row.original.logo"
            :alt="row.original.name"
            size="sm"
          />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ row.original.name }}
            </p>
            <p
              v-if="row.original.isDefault"
              class="text-xs text-gray-500"
            >
              Default team
            </p>
          </div>
        </div>
      </template>

      <template #slug-cell="{ row }">
        <code class="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {{ row.original.slug }}
        </code>
      </template>

      <template #owner-cell="{ row }">
        <div v-if="row.original.ownerName">
          <p class="text-gray-900 dark:text-white">
            {{ row.original.ownerName }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ row.original.ownerEmail }}
          </p>
        </div>
        <span
          v-else
          class="text-gray-400"
        >—</span>
      </template>

      <template #memberCount-cell="{ row }">
        <div class="flex items-center gap-1">
          <UIcon
            name="i-heroicons-users"
            class="size-4 text-gray-400"
          />
          <span class="text-gray-600 dark:text-gray-400">
            {{ row.original.memberCount }}
          </span>
        </div>
      </template>

      <template #type-cell="{ row }">
        <UBadge
          :color="row.original.personal ? 'gray' : 'primary'"
          variant="soft"
        >
          {{ row.original.personal ? 'Personal' : 'Team' }}
        </UBadge>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-gray-600 dark:text-gray-400">
          {{ formatDate(row.original.createdAt) }}
        </span>
      </template>
    </UTable>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex justify-center"
    >
      <UPagination
        :model-value="page"
        :total="total"
        :page-count="pageSize"
        @update:model-value="loadTeams"
      />
    </div>
  </div>
</template>
