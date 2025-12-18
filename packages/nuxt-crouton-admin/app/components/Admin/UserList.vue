<script setup lang="ts">
/**
 * UserList Component
 *
 * Paginated user table with search, filter, and actions.
 * Includes modals for ban and create user forms.
 */
import { ref, watch, onMounted } from 'vue'
import type { AdminUserListItem, UserListFilters, CreateUserPayload } from '../../../types/admin'

interface Props {
  /** Initial page size */
  pageSize?: number
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
})

const toast = useToast()
const {
  users,
  total,
  page,
  totalPages,
  loading,
  error,
  getUsers,
  banUser,
  unbanUser,
  deleteUser,
  createUser,
} = useAdminUsers()

const { startImpersonation } = useImpersonation()

// Filter state
const search = ref('')
const statusFilter = ref<'all' | 'active' | 'banned'>('all')

// Modal state
const showBanModal = ref(false)
const showDeleteModal = ref(false)
const showCreateModal = ref(false)
const selectedUser = ref<AdminUserListItem | null>(null)
const actionLoading = ref(false)

// Table columns
const columns = [
  { accessorKey: 'name', id: 'name', header: 'Name' },
  { accessorKey: 'email', id: 'email', header: 'Email' },
  { accessorKey: 'banned', id: 'status', header: 'Status' },
  { accessorKey: 'membershipCount', id: 'membershipCount', header: 'Teams' },
  { accessorKey: 'createdAt', id: 'createdAt', header: 'Created' },
  { accessorKey: 'id', id: 'actions', header: '' },
]

// Load users on mount and when filters change
async function loadUsers(pageNum = 1) {
  const filters: UserListFilters = {
    page: pageNum,
    pageSize: props.pageSize,
    search: search.value || undefined,
    status: statusFilter.value !== 'all' ? statusFilter.value : undefined,
  }
  await getUsers(filters)
}

// Debounced search
const debouncedSearch = useDebounceFn(() => {
  loadUsers(1)
}, 300)

watch(search, () => {
  debouncedSearch()
})

watch(statusFilter, () => {
  loadUsers(1)
})

onMounted(() => {
  loadUsers()
})

// Action handlers
function handleBan(user: AdminUserListItem) {
  selectedUser.value = user
  showBanModal.value = true
}

function handleUnban(user: AdminUserListItem) {
  selectedUser.value = user
  confirmUnban()
}

function handleDelete(user: AdminUserListItem) {
  selectedUser.value = user
  showDeleteModal.value = true
}

async function handleImpersonate(user: AdminUserListItem) {
  try {
    await startImpersonation(user.id)
  }
  catch (e) {
    toast.add({
      title: 'Impersonation failed',
      description: e instanceof Error ? e.message : 'Unknown error',
      color: 'error',
    })
  }
}

async function confirmBan(payload: { reason: string; duration: number | null }) {
  if (!selectedUser.value) return

  actionLoading.value = true
  try {
    await banUser(selectedUser.value.id, payload)
    toast.add({
      title: 'User banned',
      description: `${selectedUser.value.name} has been banned`,
      color: 'success',
    })
    showBanModal.value = false
    selectedUser.value = null
  }
  catch (e) {
    toast.add({
      title: 'Failed to ban user',
      description: e instanceof Error ? e.message : 'Unknown error',
      color: 'error',
    })
  }
  finally {
    actionLoading.value = false
  }
}

async function confirmUnban() {
  if (!selectedUser.value) return

  actionLoading.value = true
  try {
    await unbanUser(selectedUser.value.id)
    toast.add({
      title: 'User unbanned',
      description: `${selectedUser.value.name} has been unbanned`,
      color: 'success',
    })
    selectedUser.value = null
  }
  catch (e) {
    toast.add({
      title: 'Failed to unban user',
      description: e instanceof Error ? e.message : 'Unknown error',
      color: 'error',
    })
  }
  finally {
    actionLoading.value = false
  }
}

async function confirmDelete() {
  if (!selectedUser.value) return

  actionLoading.value = true
  try {
    await deleteUser(selectedUser.value.id)
    toast.add({
      title: 'User deleted',
      description: `${selectedUser.value.name} has been permanently deleted`,
      color: 'success',
    })
    showDeleteModal.value = false
    selectedUser.value = null
  }
  catch (e) {
    toast.add({
      title: 'Failed to delete user',
      description: e instanceof Error ? e.message : 'Unknown error',
      color: 'error',
    })
  }
  finally {
    actionLoading.value = false
  }
}

async function handleCreateUser(payload: CreateUserPayload) {
  actionLoading.value = true
  try {
    await createUser(payload)
    toast.add({
      title: 'User created',
      description: `${payload.name} has been created`,
      color: 'success',
    })
    showCreateModal.value = false
    loadUsers(1)
  }
  catch (e) {
    toast.add({
      title: 'Failed to create user',
      description: e instanceof Error ? e.message : 'Unknown error',
      color: 'error',
    })
  }
  finally {
    actionLoading.value = false
  }
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header with search and filters -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-1 gap-2">
        <UInput
          v-model="search"
          placeholder="Search users..."
          icon="i-heroicons-magnifying-glass"
          class="max-w-xs"
        />
        <USelect
          v-model="statusFilter"
          :items="[
            { value: 'all', label: 'All Users' },
            { value: 'active', label: 'Active' },
            { value: 'banned', label: 'Banned' },
          ]"
          value-key="value"
          class="w-32"
        />
      </div>
      <UButton
        color="primary"
        icon="i-heroicons-plus"
        @click="showCreateModal = true"
      >
        Create User
      </UButton>
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
      :rows="users"
      :loading="loading"
    >
      <template #name-cell="{ row }">
        <div class="flex items-center gap-2">
          <UAvatar
            :src="row.original.image"
            :alt="row.original.name"
            size="sm"
          />
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ row.original.name }}
            </p>
            <div v-if="row.original.superAdmin" class="flex items-center gap-1">
              <UIcon name="i-heroicons-shield-check" class="size-3 text-amber-500" />
              <span class="text-xs text-amber-600 dark:text-amber-400">Super Admin</span>
            </div>
          </div>
        </div>
      </template>

      <template #email-cell="{ row }">
        <div class="flex items-center gap-1">
          <span class="text-gray-600 dark:text-gray-400">{{ row.original.email }}</span>
          <UIcon
            v-if="row.original.emailVerified"
            name="i-heroicons-check-badge"
            class="size-4 text-green-500"
          />
        </div>
      </template>

      <template #status-cell="{ row }">
        <UBadge
          :color="row.original.banned ? 'error' : 'success'"
          variant="soft"
        >
          {{ row.original.banned ? 'Banned' : 'Active' }}
        </UBadge>
      </template>

      <template #membershipCount-cell="{ row }">
        <span class="text-gray-600 dark:text-gray-400">
          {{ row.original.membershipCount }}
        </span>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-gray-600 dark:text-gray-400">
          {{ formatDate(row.original.createdAt) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <AdminUserActions
          :user="row.original"
          :loading="actionLoading && selectedUser?.id === row.original.id"
          @ban="handleBan"
          @unban="handleUnban"
          @delete="handleDelete"
          @impersonate="handleImpersonate"
        />
      </template>
    </UTable>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center">
      <UPagination
        :model-value="page"
        :total="total"
        :page-count="pageSize"
        @update:model-value="loadUsers"
      />
    </div>

    <!-- Ban Modal -->
    <UModal v-model:open="showBanModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Ban User
          </h3>
          <AdminUserBanForm
            v-if="selectedUser"
            :user="selectedUser"
            :loading="actionLoading"
            @submit="confirmBan"
            @cancel="showBanModal = false"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Delete User
          </h3>
          <p class="mb-4 text-gray-600 dark:text-gray-400">
            Are you sure you want to permanently delete
            <strong>{{ selectedUser?.name }}</strong>?
            This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="actionLoading"
              @click="showDeleteModal = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="actionLoading"
              @click="confirmDelete"
            >
              Delete User
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Create User Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6">
          <h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Create User
          </h3>
          <AdminUserCreateForm
            :loading="actionLoading"
            @submit="handleCreateUser"
            @cancel="showCreateModal = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
