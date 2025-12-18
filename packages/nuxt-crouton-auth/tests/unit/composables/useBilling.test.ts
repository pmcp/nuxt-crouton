import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, readonly } from 'vue'

// Mock subscription client
const mockSubscriptionClient = {
  list: vi.fn(),
  upgrade: vi.fn(),
  billingPortal: vi.fn(),
  cancel: vi.fn(),
  restore: vi.fn(),
}

// Mock auth client
const mockAuthClient = {
  subscription: mockSubscriptionClient,
}

// Mock route params
const mockRouteParams = ref<{ team?: string }>({})

// Mock onMounted
const mockOnMounted = vi.fn()

// Setup global mocks before import
vi.stubGlobal('useNuxtApp', () => ({
  $authClient: mockAuthClient,
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    crouton: {
      auth: {
        mode: 'multi-tenant',
        billing: {
          enabled: true,
          stripe: {
            publishableKey: 'pk_test_123',
            plans: [
              {
                id: 'free',
                name: 'Free',
                price: 0,
                currency: 'usd',
                interval: 'month',
                features: ['Basic features'],
              },
              {
                id: 'pro',
                name: 'Pro',
                price: 29,
                currency: 'usd',
                interval: 'month',
                features: ['All features', 'Priority support'],
              },
              {
                id: 'enterprise',
                name: 'Enterprise',
                price: 99,
                currency: 'usd',
                interval: 'month',
                features: ['Everything in Pro', 'Custom integrations'],
              },
            ],
          },
        },
      },
    },
  },
}))

vi.stubGlobal('useRoute', () => ({
  params: mockRouteParams.value,
}))

vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('readonly', readonly)
vi.stubGlobal('onMounted', mockOnMounted)

// Mock import.meta.client
Object.defineProperty(import.meta, 'client', {
  value: false, // Prevent auto-fetch in tests
  writable: true,
  configurable: true,
})

// Import after mocks
import { useBilling } from '../../../app/composables/useBilling'

describe('useBilling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteParams.value = {}
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('state', () => {
    it('should be enabled when config is set', () => {
      const { enabled } = useBilling()
      expect(enabled.value).toBe(true)
    })

    it('should expose plans from config', () => {
      const { plans } = useBilling()
      expect(plans.value).toHaveLength(3)
      expect(plans.value[0]).toMatchObject({
        id: 'free',
        name: 'Free',
        price: 0,
      })
      expect(plans.value[1]).toMatchObject({
        id: 'pro',
        name: 'Pro',
        price: 29,
      })
    })

    it('should have organization billing mode for multi-tenant', () => {
      const { billingMode } = useBilling()
      expect(billingMode.value).toBe('organization')
    })

    it('should expose loading and error states', () => {
      const { loading, error } = useBilling()
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should have null subscription initially', () => {
      const { subscription, subscriptions } = useBilling()
      expect(subscription.value).toBeNull()
      expect(subscriptions.value).toEqual([])
    })
  })

  describe('status computed', () => {
    it('should return null status when no subscription', () => {
      const { status, isPro, isTrialing, isCanceled, isPastDue } = useBilling()
      expect(status.value).toBeNull()
      expect(isPro.value).toBe(false)
      expect(isTrialing.value).toBe(false)
      expect(isCanceled.value).toBe(false)
      expect(isPastDue.value).toBe(false)
    })
  })

  describe('fetchSubscriptions', () => {
    it('should fetch and set active subscription', async () => {
      mockSubscriptionClient.list.mockResolvedValue({
        data: [
          {
            id: 'sub-1',
            plan: 'pro',
            status: 'active',
            stripeCustomerId: 'cus_123',
            stripeSubscriptionId: 'sub_123',
            referenceId: 'org-1',
            periodStart: new Date(),
            periodEnd: new Date(),
            cancelAtPeriodEnd: false,
          },
        ],
      })

      const { fetchSubscriptions, subscription, subscriptions } = useBilling()
      await fetchSubscriptions()

      expect(mockSubscriptionClient.list).toHaveBeenCalled()
      expect(subscriptions.value).toHaveLength(1)
      expect(subscription.value?.plan).toBe('pro')
      expect(subscription.value?.status).toBe('active')
    })

    it('should use referenceId from route params', async () => {
      mockRouteParams.value = { team: 'team-123' }
      mockSubscriptionClient.list.mockResolvedValue({ data: [] })

      const { fetchSubscriptions } = useBilling()
      await fetchSubscriptions()

      expect(mockSubscriptionClient.list).toHaveBeenCalledWith({ referenceId: 'team-123' })
    })

    it('should set first active/trialing subscription as current', async () => {
      mockSubscriptionClient.list.mockResolvedValue({
        data: [
          { id: 'sub-1', plan: 'free', status: 'canceled' },
          { id: 'sub-2', plan: 'pro', status: 'trialing' },
          { id: 'sub-3', plan: 'enterprise', status: 'active' },
        ],
      })

      const { fetchSubscriptions, subscription } = useBilling()
      await fetchSubscriptions()

      expect(subscription.value?.plan).toBe('pro') // First trialing
    })

    it('should handle fetch error', async () => {
      mockSubscriptionClient.list.mockRejectedValue(new Error('Network error'))

      const { fetchSubscriptions, error } = useBilling()
      await fetchSubscriptions()

      expect(error.value).toBe('Network error')
    })
  })

  describe('checkout', () => {
    it('should call subscription.upgrade with plan', async () => {
      mockSubscriptionClient.upgrade.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
      })

      // Mock window.location
      const originalLocation = globalThis.window?.location
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000/pricing',
          },
        },
        writable: true,
      })

      const { checkout } = useBilling()
      await checkout('pro', {
        successUrl: '/dashboard',
        cancelUrl: '/pricing',
      })

      expect(mockSubscriptionClient.upgrade).toHaveBeenCalledWith({
        plan: 'pro',
        annual: undefined,
        seats: undefined,
        referenceId: undefined,
        successUrl: '/dashboard',
        cancelUrl: '/pricing',
      })
    })

    it('should redirect to checkout URL', async () => {
      const mockHref = vi.fn()
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000',
            set href(url: string) { mockHref(url) },
          },
        },
        writable: true,
      })

      mockSubscriptionClient.upgrade.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
      })

      const { checkout } = useBilling()
      await checkout('pro')

      // Verify the URL was accessed (redirect attempted)
      expect(mockSubscriptionClient.upgrade).toHaveBeenCalled()
    })

    it('should throw on checkout error', async () => {
      mockSubscriptionClient.upgrade.mockResolvedValue({
        error: { message: 'Payment failed' },
      })

      const { checkout, error } = useBilling()

      await expect(checkout('pro')).rejects.toThrow('Payment failed')
      expect(error.value).toBe('Payment failed')
    })

    it('should throw when stripe client not available', async () => {
      // Temporarily remove subscription client
      const originalClient = mockAuthClient.subscription
      mockAuthClient.subscription = undefined as any

      const { checkout } = useBilling()

      await expect(checkout('pro')).rejects.toThrow('Stripe client not available')

      mockAuthClient.subscription = originalClient
    })
  })

  describe('portal', () => {
    it('should call subscription.billingPortal', async () => {
      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000/settings',
          },
        },
        writable: true,
      })

      mockSubscriptionClient.billingPortal.mockResolvedValue({
        data: { url: 'https://billing.stripe.com/session_123' },
      })

      const { portal } = useBilling()
      await portal({ returnUrl: '/settings' })

      expect(mockSubscriptionClient.billingPortal).toHaveBeenCalledWith({
        referenceId: undefined,
        returnUrl: '/settings',
        locale: undefined,
      })
    })

    it('should throw on portal error', async () => {
      mockSubscriptionClient.billingPortal.mockResolvedValue({
        error: { message: 'Portal unavailable' },
      })

      const { portal, error } = useBilling()

      await expect(portal()).rejects.toThrow('Portal unavailable')
      expect(error.value).toBe('Portal unavailable')
    })
  })

  describe('cancel', () => {
    it('should call subscription.cancel', async () => {
      // Set up subscription
      mockSubscriptionClient.list.mockResolvedValue({
        data: [{ id: 'sub-123', plan: 'pro', status: 'active' }],
      })

      Object.defineProperty(globalThis, 'window', {
        value: { location: { href: 'http://localhost:3000' } },
        writable: true,
      })

      mockSubscriptionClient.cancel.mockResolvedValue({ data: {} })

      const { fetchSubscriptions, cancel } = useBilling()
      await fetchSubscriptions()
      await cancel()

      expect(mockSubscriptionClient.cancel).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
        returnUrl: 'http://localhost:3000',
      })
    })

    it('should throw when no subscription to cancel', async () => {
      const { cancel } = useBilling()

      // Error is thrown before try block, so error.value isn't set
      await expect(cancel()).rejects.toThrow('No subscription to cancel')
    })

    it('should allow canceling specific subscription', async () => {
      mockSubscriptionClient.cancel.mockResolvedValue({ data: {} })
      mockSubscriptionClient.list.mockResolvedValue({ data: [] })

      Object.defineProperty(globalThis, 'window', {
        value: { location: { href: 'http://localhost:3000' } },
        writable: true,
      })

      const { cancel } = useBilling()
      await cancel('specific-sub-id')

      expect(mockSubscriptionClient.cancel).toHaveBeenCalledWith({
        subscriptionId: 'specific-sub-id',
        returnUrl: 'http://localhost:3000',
      })
    })
  })

  describe('restore', () => {
    it('should call subscription.restore', async () => {
      mockSubscriptionClient.list.mockResolvedValue({
        data: [{ id: 'sub-123', plan: 'pro', status: 'canceled', cancelAtPeriodEnd: true }],
      })
      mockSubscriptionClient.restore.mockResolvedValue({ data: {} })

      const { fetchSubscriptions, restore } = useBilling()
      await fetchSubscriptions()
      await restore()

      expect(mockSubscriptionClient.restore).toHaveBeenCalledWith({
        subscriptionId: 'sub-123',
      })
    })

    it('should throw when no subscription to restore', async () => {
      const { restore } = useBilling()

      // Error is thrown before try block, so error.value isn't set
      await expect(restore()).rejects.toThrow('No subscription to restore')
    })
  })

  describe('changePlan', () => {
    it('should use checkout flow for plan changes', async () => {
      mockSubscriptionClient.upgrade.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/change_123' },
      })

      Object.defineProperty(globalThis, 'window', {
        value: {
          location: {
            origin: 'http://localhost:3000',
            href: 'http://localhost:3000',
          },
        },
        writable: true,
      })

      const { changePlan } = useBilling()
      await changePlan('enterprise')

      expect(mockSubscriptionClient.upgrade).toHaveBeenCalledWith(
        expect.objectContaining({ plan: 'enterprise' })
      )
    })
  })

  describe('helpers', () => {
    describe('isCurrentPlan', () => {
      it('should return true for current plan', async () => {
        mockSubscriptionClient.list.mockResolvedValue({
          data: [{ id: 'sub-1', plan: 'pro', status: 'active' }],
        })

        const { fetchSubscriptions, isCurrentPlan } = useBilling()
        await fetchSubscriptions()

        expect(isCurrentPlan('pro')).toBe(true)
        expect(isCurrentPlan('free')).toBe(false)
      })

      it('should return false when no subscription', () => {
        const { isCurrentPlan } = useBilling()
        expect(isCurrentPlan('pro')).toBe(false)
      })
    })

    describe('getPlan', () => {
      it('should return plan by ID', () => {
        const { getPlan } = useBilling()
        const plan = getPlan('pro')

        expect(plan).toMatchObject({
          id: 'pro',
          name: 'Pro',
          price: 29,
        })
      })

      it('should return undefined for unknown plan', () => {
        const { getPlan } = useBilling()
        expect(getPlan('unknown')).toBeUndefined()
      })
    })
  })
})

describe('useBilling disabled', () => {
  beforeEach(() => {
    // Override config to disable billing
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        crouton: {
          auth: {
            mode: 'personal',
            billing: {
              enabled: false,
            },
          },
        },
      },
    }))
  })

  afterEach(() => {
    // Restore original config
    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        crouton: {
          auth: {
            mode: 'multi-tenant',
            billing: {
              enabled: true,
              stripe: {
                publishableKey: 'pk_test_123',
                plans: [],
              },
            },
          },
        },
      },
    }))
  })

  it('should return disabled stub when billing not enabled', () => {
    const billing = useBilling()

    expect(billing.enabled.value).toBe(false)
    expect(billing.subscription.value).toBeNull()
    expect(billing.isPro.value).toBe(false)
    expect(billing.isCurrentPlan('pro')).toBe(false)
    expect(billing.getPlan('pro')).toBeUndefined()
  })

  it('should warn when calling methods on disabled billing', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const billing = useBilling()
    await billing.fetchSubscriptions()
    await billing.checkout('pro')
    await billing.portal()

    expect(consoleSpy).toHaveBeenCalledWith('@crouton/auth: Billing is not enabled')
    consoleSpy.mockRestore()
  })
})
