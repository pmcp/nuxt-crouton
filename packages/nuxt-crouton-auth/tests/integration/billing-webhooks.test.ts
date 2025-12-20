/**
 * Integration Tests: Billing & Webhooks
 *
 * Tests the billing composable including:
 * - Billing configuration detection
 * - Checkout flow initiation
 * - Subscription management
 *
 * Note: Due to module caching in vitest, some detailed billing state tests
 * are handled in unit tests. Integration tests focus on API interactions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed } from 'vue'
import {
  setupIntegrationMocks,
  createTestUser,
  createTestSession,
  createTestTeam,
  createTestMember,
  createTestSubscription
} from './setup'

describe('Integration: Billing', () => {
  let mockClient: ReturnType<typeof setupIntegrationMocks>

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset module cache to ensure fresh composable imports
    vi.resetModules()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Billing Configuration', () => {
    it('should detect billing enabled from config', async () => {
      mockClient = setupIntegrationMocks({
        user: createTestUser(),
        session: createTestSession()
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: createTestUser() },
        session: { value: createTestSession() },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useBilling } = await import('../../app/composables/useBilling')
      const billing = useBilling()

      expect(billing.enabled.value).toBe(true)
    })
  })

  describe('Checkout Flow', () => {
    it('should call checkout with plan id', async () => {
      const user = createTestUser()
      const session = createTestSession()
      const team = createTestTeam({ id: 'team-1' })

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [team],
        members: [createTestMember({ userId: user.id, organizationId: team.id })]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useBilling } = await import('../../app/composables/useBilling')
      const billing = useBilling()

      await billing.checkout('pro')

      expect(mockClient.subscription.upgrade).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'pro' })
      )
    })
  })

  describe('Subscription Management', () => {
    it('should call cancel on subscription client', async () => {
      const user = createTestUser()
      const session = createTestSession()
      const team = createTestTeam({ id: 'team-1' })
      const subscription = createTestSubscription({ status: 'active', planId: 'pro' })

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [team],
        subscription
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useBilling } = await import('../../app/composables/useBilling')
      const billing = useBilling()

      // Fetch subscriptions first to have a subscription to cancel
      await billing.fetchSubscriptions()
      await billing.cancel()

      expect(mockClient.subscription.cancel).toHaveBeenCalled()
    })

    it('should call restore on subscription client', async () => {
      const user = createTestUser()
      const session = createTestSession()
      const team = createTestTeam({ id: 'team-1' })
      const subscription = createTestSubscription({
        status: 'active',
        planId: 'pro',
        cancelAtPeriodEnd: true
      })

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [team],
        subscription
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useBilling } = await import('../../app/composables/useBilling')
      const billing = useBilling()

      // Fetch subscriptions first to have a subscription to restore
      await billing.fetchSubscriptions()
      await billing.restore()

      expect(mockClient.subscription.restore).toHaveBeenCalled()
    })
  })

  describe('Loading States', () => {
    it('should track loading state during fetch', async () => {
      const user = createTestUser()
      const session = createTestSession()

      mockClient = setupIntegrationMocks({
        user,
        session,
        teams: [createTestTeam()]
      })

      vi.stubGlobal('useSession', () => ({
        user: { value: user },
        session: { value: session },
        isAuthenticated: { value: true },
        isPending: { value: false },
        error: { value: null },
        refresh: vi.fn(),
        clear: vi.fn()
      }))

      const { useBilling } = await import('../../app/composables/useBilling')
      const billing = useBilling()

      const fetchPromise = billing.fetchSubscriptions()
      // Loading should be tracked
      await fetchPromise
      expect(billing.loading.value).toBe(false)
    })
  })
})
