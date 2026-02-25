<script setup lang="ts">
/**
 * Super Admin Users Page
 *
 * User management with search, ban/unban, and impersonation.
 */
definePageMeta({
  layout: 'super-admin',
  middleware: 'super-admin'
})

useSeoMeta({ title: 'Users - Super Admin' })

const search = ref('')
const debouncedSearch = ref('')

const searchTimer = ref<ReturnType<typeof setTimeout>>()
watch(search, (val) => {
  clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => { debouncedSearch.value = val }, 300)
})

const { data, status, error, refresh } = await useFetch('/api/admin/users', {
  query: computed(() => ({
    pageSize: 50,
    search: debouncedSearch.value || undefined
  }))
})

const columns = [
  { accessorKey: 'name', header: 'User' },
  { accessorKey: 'membershipCount', header: 'Teams' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Joined' },
  { accessorKey: 'actions', header: '' }
]

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString()
}

// Impersonation
const { startImpersonation } = useImpersonation()
const impersonating = ref(false)

async function handleImpersonate(userId: string) {
  impersonating.value = true
  try {
    await startImpersonation(userId)
  } catch {
    impersonating.value = false
  }
}
</script>

<template>
  <div class="p-6">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Users</h1>
        <p class="text-sm text-muted">Manage all user accounts</p>
      </div>
    </div>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      title="Failed to load users"
      :description="error.message"
      class="mb-4"
    />

    <UInput
      v-model="search"
      placeholder="Search users..."
      icon="i-lucide-search"
      class="mb-4 max-w-sm"
    />

    <UTable
      :data="data?.items ?? []"
      :columns="columns"
      :loading="status === 'pending'"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar :src="row.original.image" :alt="row.original.name" size="sm" />
          <div>
            <p class="font-medium">{{ row.original.name }}</p>
            <p class="text-xs text-muted">{{ row.original.email }}</p>
          </div>
          <UBadge v-if="row.original.superAdmin" color="primary" variant="subtle" size="xs">
            Admin
          </UBadge>
        </div>
      </template>

      <template #membershipCount-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.membershipCount }}</span>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.banned ? 'error' : 'success'"
          variant="subtle"
          size="xs"
        >
          {{ row.original.banned ? 'Banned' : 'Active' }}
        </UBadge>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>

      <template #actions-cell="{ row }">
        <UDropdownMenu
          v-if="!row.original.superAdmin"
          :items="[
            [{
              label: 'Impersonate',
              icon: 'i-lucide-eye',
              disabled: row.original.banned,
              onSelect: () => handleImpersonate(row.original.id)
            }]
          ]"
        >
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-ellipsis-vertical"
            size="xs"
            :loading="impersonating"
          />
        </UDropdownMenu>
      </template>
    </UTable>
  </div>
</template>
