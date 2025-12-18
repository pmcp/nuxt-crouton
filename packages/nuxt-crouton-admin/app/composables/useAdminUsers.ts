/**
 * useAdminUsers Composable
 *
 * Provides user management functionality for super admins.
 * Wraps the admin user API endpoints with reactive state.
 *
 * @example
 * ```vue
 * <script setup>
 * const { users, loading, getUsers, banUser, deleteUser } = useAdminUsers()
 *
 * // Load users with filters
 * await getUsers({ status: 'active', page: 1 })
 *
 * // Ban a user
 * await banUser('user-id', { reason: 'Spam', duration: 168 })
 *
 * // Delete a user
 * await deleteUser('user-id')
 * </script>
 * ```
 */
import { ref, readonly } from 'vue'
import type {
  AdminUserListItem,
  AdminUserDetail,
  AdminUser,
  UserListFilters,
  PaginatedResponse,
  BanPayload,
  CreateUserPayload,
} from '../../types/admin'

export function useAdminUsers() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Current paginated list state
  const users = ref<AdminUserListItem[]>([])
  const total = ref(0)
  const page = ref(1)
  const pageSize = ref(20)
  const totalPages = ref(0)

  /**
   * Fetch paginated list of users
   *
   * @param filters - Optional filters for the query
   * @returns Paginated response with users
   */
  async function getUsers(filters?: UserListFilters): Promise<PaginatedResponse<AdminUserListItem>> {
    loading.value = true
    error.value = null
    try {
      const query = new URLSearchParams()
      if (filters?.page) query.set('page', String(filters.page))
      if (filters?.pageSize) query.set('pageSize', String(filters.pageSize))
      if (filters?.search) query.set('search', filters.search)
      if (filters?.status) query.set('status', filters.status)
      if (filters?.superAdmin !== undefined) query.set('superAdmin', String(filters.superAdmin))
      if (filters?.sortBy) query.set('sortBy', filters.sortBy)
      if (filters?.sortOrder) query.set('sortOrder', filters.sortOrder)

      const queryString = query.toString()
      const url = `/api/admin/users${queryString ? `?${queryString}` : ''}`

      const response = await $fetch<PaginatedResponse<AdminUserListItem>>(url)

      // Update reactive state
      users.value = response.items
      total.value = response.total
      page.value = response.page
      pageSize.value = response.pageSize
      totalPages.value = response.totalPages

      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch users'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Get detailed user information by ID
   *
   * @param userId - User ID to fetch
   * @returns User detail with memberships, sessions, and accounts
   */
  async function getUser(userId: string): Promise<AdminUserDetail> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminUserDetail>(`/api/admin/users/${userId}`)
      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch user'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Create a new user
   *
   * @param data - User data to create
   * @returns Created user
   */
  async function createUser(data: CreateUserPayload): Promise<AdminUser> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminUser>('/api/admin/users/create', {
        method: 'POST',
        body: data,
      })
      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to create user'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Ban a user
   *
   * @param userId - User ID to ban
   * @param payload - Ban details (reason, duration)
   * @returns Updated user
   */
  async function banUser(userId: string, payload: Omit<BanPayload, 'userId'>): Promise<AdminUser> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminUser>('/api/admin/users/ban', {
        method: 'POST',
        body: {
          userId,
          ...payload,
        },
      })

      // Update user in local list if present
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = {
          ...users.value[index],
          banned: response.banned,
          bannedReason: response.bannedReason,
          bannedUntil: response.bannedUntil,
        }
      }

      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to ban user'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Unban a user
   *
   * @param userId - User ID to unban
   * @returns Updated user
   */
  async function unbanUser(userId: string): Promise<AdminUser> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminUser>('/api/admin/users/unban', {
        method: 'POST',
        body: { userId },
      })

      // Update user in local list if present
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value[index] = {
          ...users.value[index],
          banned: response.banned,
          bannedReason: response.bannedReason,
          bannedUntil: response.bannedUntil,
        }
      }

      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to unban user'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete a user permanently
   *
   * @param userId - User ID to delete
   * @returns Delete response
   */
  async function deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<{ success: boolean; message: string; deletedUserId: string }>('/api/admin/users/delete', {
        method: 'DELETE',
        body: { userId },
      })

      // Remove user from local list if present
      const index = users.value.findIndex(u => u.id === userId)
      if (index !== -1) {
        users.value.splice(index, 1)
        total.value -= 1
      }

      return response
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to delete user'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    // State
    users: readonly(users),
    total: readonly(total),
    page: readonly(page),
    pageSize: readonly(pageSize),
    totalPages: readonly(totalPages),
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    getUsers,
    getUser,
    createUser,
    banUser,
    unbanUser,
    deleteUser,
  }
}
