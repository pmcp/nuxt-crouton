/**
 * Composable for fetching Notion workspace users
 *
 * Wrapper around the /api/notion/users endpoint for use in user mapping.
 * Filters out bots by default and provides search functionality.
 *
 * @example
 * ```ts
 * const { fetchNotionUsers, users, loading, error } = useNotionUsers()
 *
 * await fetchNotionUsers({
 *   notionToken: 'secret_xxx',
 *   teamId: 'team123'
 * })
 *
 * // Search users
 * const results = searchUsers('john')
 * ```
 */

export interface NotionUser {
  id: string
  name: string
  email: string | null
  type: 'person' | 'bot'
  avatarUrl: string | null
}

export interface FetchNotionUsersOptions {
  notionToken: string
  teamId: string
  includeBots?: boolean
}

export function useNotionUsers() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const users = ref<NotionUser[]>([])

  /**
   * Fetch Notion workspace users
   */
  async function fetchNotionUsers(options: FetchNotionUsersOptions): Promise<NotionUser[]> {
    const { notionToken, teamId, includeBots = false } = options

    if (!notionToken || !teamId) {
      error.value = 'Please provide both Notion token and team ID'
      return []
    }

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{
        success: boolean
        users: NotionUser[]
        total: number
      }>('/api/notion/users', {
        query: {
          notionToken,
          teamId,
          includeBots: includeBots.toString()
        }
      })

      if (response.success) {
        users.value = response.users
        return response.users
      } else {
        throw new Error('Failed to fetch Notion users')
      }
    } catch (err: any) {
      console.error('Failed to fetch Notion users:', err)

      if (err.statusCode === 401) {
        error.value = 'Invalid Notion token or insufficient permissions'
      } else if (err.statusCode === 429) {
        error.value = 'Notion rate limit exceeded. Please try again later.'
      } else {
        error.value = err.data?.statusMessage || err.message || 'Failed to fetch Notion users'
      }

      users.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * Search users by name or email
   */
  function searchUsers(query: string): NotionUser[] {
    if (!query.trim()) {
      return users.value
    }

    const lowerQuery = query.toLowerCase()
    return users.value.filter(user =>
      user.name.toLowerCase().includes(lowerQuery) ||
      (user.email && user.email.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * Find user by ID
   */
  function findUserById(id: string): NotionUser | undefined {
    return users.value.find(user => user.id === id)
  }

  /**
   * Find user by email
   */
  function findUserByEmail(email: string): NotionUser | undefined {
    if (!email) return undefined
    const lowerEmail = email.toLowerCase()
    return users.value.find(user =>
      user.email && user.email.toLowerCase() === lowerEmail
    )
  }

  /**
   * Clear users and error state
   */
  function clearUsers() {
    users.value = []
    error.value = null
  }

  return {
    fetchNotionUsers,
    searchUsers,
    findUserById,
    findUserByEmail,
    clearUsers,
    users,
    loading,
    error,
  }
}
