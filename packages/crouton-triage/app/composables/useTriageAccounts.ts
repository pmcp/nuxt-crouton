/**
 * Composable for managing connected accounts (triageAccounts)
 *
 * Provides CRUD operations for team-scoped connected accounts.
 * Accounts store encrypted tokens for Slack, Notion, and other providers.
 *
 * @example
 * ```ts
 * const { accounts, fetchAccounts, verifyAccount, createManualAccount } = useTriageAccounts(teamId)
 *
 * await fetchAccounts()
 * const slackAccounts = getAccountsByProvider('slack')
 * ```
 */

import type { ConnectedAccount, AccountProvider } from '~/layers/triage/types'

export function useTriageAccounts(teamId: string | Ref<string>) {
  const resolvedTeamId = computed(() => isRef(teamId) ? teamId.value : teamId)

  const accounts = ref<ConnectedAccount[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch all connected accounts for the team
   */
  async function fetchAccounts() {
    if (!resolvedTeamId.value) return

    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ConnectedAccount[]>(
        `/api/teams/${resolvedTeamId.value}/triage-accounts`,
      )
      accounts.value = response || []
    } catch (err: any) {
      error.value = err.data?.statusMessage || err.message || 'Failed to fetch accounts'
      console.error('[useTriageAccounts] fetchAccounts failed:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Get accounts filtered by provider
   */
  function getAccountsByProvider(provider: AccountProvider) {
    return computed(() =>
      accounts.value.filter(a => a.provider === provider),
    )
  }

  /**
   * Verify a connected account's token
   */
  async function verifyAccount(accountId: string) {
    if (!resolvedTeamId.value) return null

    try {
      const result = await $fetch<{ success: boolean; status: string; error?: string }>(
        `/api/crouton-triage/teams/${resolvedTeamId.value}/accounts/${accountId}/verify`,
        { method: 'POST' },
      )

      // Update local state
      const index = accounts.value.findIndex(a => a.id === accountId)
      if (index !== -1) {
        accounts.value[index] = {
          ...accounts.value[index],
          status: result.status as ConnectedAccount['status'],
          lastVerifiedAt: result.success ? new Date() : accounts.value[index].lastVerifiedAt,
        }
      }

      return result
    } catch (err: any) {
      console.error('[useTriageAccounts] verifyAccount failed:', err)
      return {
        success: false,
        status: 'error',
        error: err.data?.statusMessage || err.message || 'Verification failed',
      }
    }
  }

  /**
   * Create a manually connected account (e.g., paste Notion API token)
   */
  async function createManualAccount(data: {
    provider: AccountProvider
    label: string
    token: string
    providerAccountId?: string
    providerMetadata?: Record<string, any>
  }) {
    if (!resolvedTeamId.value) return null

    try {
      const result = await $fetch<{ success: boolean; account: any }>(
        `/api/crouton-triage/teams/${resolvedTeamId.value}/accounts/connect`,
        {
          method: 'POST',
          body: data,
        },
      )

      // Refresh accounts list
      await fetchAccounts()

      return result
    } catch (err: any) {
      console.error('[useTriageAccounts] createManualAccount failed:', err)
      throw err
    }
  }

  /**
   * Delete a connected account
   */
  async function deleteAccount(accountId: string) {
    if (!resolvedTeamId.value) return

    try {
      await $fetch(
        `/api/teams/${resolvedTeamId.value}/triage-accounts/${accountId}`,
        { method: 'DELETE' },
      )

      // Remove from local state
      accounts.value = accounts.value.filter(a => a.id !== accountId)
    } catch (err: any) {
      console.error('[useTriageAccounts] deleteAccount failed:', err)
      throw err
    }
  }

  return {
    /** All connected accounts */
    accounts,
    /** Loading state */
    loading,
    /** Error message */
    error,
    /** Fetch all accounts */
    fetchAccounts,
    /** Get accounts by provider (returns computed) */
    getAccountsByProvider,
    /** Verify account token */
    verifyAccount,
    /** Create manual account */
    createManualAccount,
    /** Delete account */
    deleteAccount,
  }
}
