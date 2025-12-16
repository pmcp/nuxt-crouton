/**
 * useBilling Composable
 *
 * Billing and subscription management with Stripe integration.
 * Uses Better Auth's Stripe plugin under the hood.
 *
 * Supports two billing modes:
 * - User-based billing (personal mode): Subscriptions tied to individual users
 * - Organization-based billing (multi-tenant/single-tenant): Subscriptions tied to teams
 *
 * @example
 * ```vue
 * <script setup>
 * const { subscription, isPro, checkout, portal } = useBilling()
 *
 * // Upgrade to a plan
 * const handleUpgrade = async () => {
 *   await checkout('pro', {
 *     successUrl: '/dashboard',
 *     cancelUrl: '/pricing',
 *   })
 * }
 *
 * // Access customer portal
 * const handleManageBilling = async () => {
 *   await portal()
 * }
 * </script>
 * ```
 */
import type { CroutonAuthConfig, StripePlan } from '../../types/config'

/**
 * Subscription status values from Stripe
 */
export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'unpaid'
  | 'paused'

/**
 * Subscription data returned from Better Auth
 */
export interface Subscription {
  id: string
  plan: string
  referenceId: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  periodStart: Date
  periodEnd: Date
  cancelAtPeriodEnd: boolean
  seats?: number
  trialStart?: Date
  trialEnd?: Date
}

/**
 * Plan info for display
 */
export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features?: string[]
}

/**
 * Checkout options
 */
export interface CheckoutOptions {
  /** URL to redirect to after successful checkout */
  successUrl?: string
  /** URL to redirect to if checkout is canceled */
  cancelUrl?: string
  /** Number of seats (for team plans) */
  seats?: number
  /** Use annual billing if available */
  annual?: boolean
  /** Reference ID for organization billing (defaults to current team) */
  referenceId?: string
}

/**
 * Portal options
 */
export interface PortalOptions {
  /** URL to redirect to when leaving portal */
  returnUrl?: string
  /** Reference ID for organization billing (defaults to current team) */
  referenceId?: string
  /** Locale for the portal (e.g., 'en-US') */
  locale?: string
}

export function useBilling() {
  const nuxtApp = useNuxtApp()
  const config = useRuntimeConfig().public.crouton?.auth as CroutonAuthConfig | undefined
  const route = useRoute()

  // Get the auth client from the plugin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = nuxtApp.$authClient as any

  // Check if billing is enabled
  const enabled = computed(() => config?.billing?.enabled === true && !!config?.billing?.stripe?.publishableKey)

  // Get billing mode (user vs organization)
  const billingMode = computed(() => config?.mode === 'personal' ? 'user' : 'organization')

  // Return stub if billing not enabled
  if (!enabled.value) {
    return createDisabledBillingStub()
  }

  // Reactive state
  const subscription = ref<Subscription | null>(null)
  const subscriptions = ref<Subscription[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Get available plans from config
  const plans = computed<Plan[]>(() => {
    const stripePlans = config?.billing?.stripe?.plans ?? []
    return stripePlans.map((plan: StripePlan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency ?? 'usd',
      interval: plan.interval,
      features: plan.features ?? [],
    }))
  })

  // Get the current team ID for organization billing
  const getCurrentReferenceId = (): string | undefined => {
    if (billingMode.value === 'user') {
      return undefined // Use user's ID (handled by Better Auth)
    }
    // For organization billing, try to get team from route or session
    const teamId = route.params.team as string | undefined
    return teamId
  }

  // Computed status
  const status = computed<SubscriptionStatus | null>(() => subscription.value?.status ?? null)

  const plan = computed<Plan | null>(() => {
    if (!subscription.value) return null
    return plans.value.find((p) => p.id === subscription.value?.plan) ?? null
  })

  const isPro = computed(() => {
    const s = subscription.value?.status
    return s === 'active' || s === 'trialing'
  })

  const isTrialing = computed(() => {
    return subscription.value?.status === 'trialing'
  })

  const isCanceled = computed(() => {
    return subscription.value?.status === 'canceled' || subscription.value?.cancelAtPeriodEnd === true
  })

  const isPastDue = computed(() => {
    return subscription.value?.status === 'past_due'
  })

  const trialEndsAt = computed(() => {
    return subscription.value?.trialEnd ?? null
  })

  const currentPeriodEnd = computed(() => {
    return subscription.value?.periodEnd ?? null
  })

  const cancelAtPeriodEnd = computed(() => {
    return subscription.value?.cancelAtPeriodEnd ?? false
  })

  /**
   * Fetch the current subscription(s) from Better Auth
   */
  async function fetchSubscriptions(referenceId?: string): Promise<void> {
    if (!client?.subscription) {
      console.warn('@crouton/auth: Stripe client not available')
      return
    }

    loading.value = true
    error.value = null
    try {
      const ref = referenceId ?? getCurrentReferenceId()
      const result = await client.subscription.list(ref ? { referenceId: ref } : undefined)

      if (result.data) {
        subscriptions.value = result.data
        // Set the first active subscription as the current one
        subscription.value = result.data.find(
          (s: Subscription) => s.status === 'active' || s.status === 'trialing'
        ) ?? result.data[0] ?? null
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch subscriptions'
      console.error('@crouton/auth: Failed to fetch subscriptions', e)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Start checkout flow for a subscription
   *
   * Redirects the user to Stripe Checkout to complete payment.
   *
   * @param planId - The plan ID to subscribe to
   * @param options - Checkout options
   */
  async function checkout(planId: string, options: CheckoutOptions = {}): Promise<void> {
    if (!client?.subscription) {
      throw new Error('@crouton/auth: Stripe client not available')
    }

    loading.value = true
    error.value = null
    try {
      const result = await client.subscription.upgrade({
        plan: planId,
        annual: options.annual,
        seats: options.seats,
        referenceId: options.referenceId ?? getCurrentReferenceId(),
        successUrl: options.successUrl ?? `${window.location.origin}/dashboard`,
        cancelUrl: options.cancelUrl ?? window.location.href,
      })

      // Handle redirect to Stripe Checkout
      if (result.data?.url) {
        window.location.href = result.data.url
      }
      else if (result.error) {
        throw new Error(result.error.message || 'Checkout failed')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Checkout failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Open the Stripe Customer Portal
   *
   * Allows customers to manage their subscription, update payment methods,
   * view invoices, etc.
   *
   * @param options - Portal options
   */
  async function portal(options: PortalOptions = {}): Promise<void> {
    if (!client?.subscription) {
      throw new Error('@crouton/auth: Stripe client not available')
    }

    loading.value = true
    error.value = null
    try {
      const result = await client.subscription.billingPortal({
        referenceId: options.referenceId ?? getCurrentReferenceId(),
        returnUrl: options.returnUrl ?? window.location.href,
        locale: options.locale,
      })

      // Handle redirect to Stripe Portal
      if (result.data?.url) {
        window.location.href = result.data.url
      }
      else if (result.error) {
        throw new Error(result.error.message || 'Portal redirect failed')
      }
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Portal redirect failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Cancel the current subscription
   *
   * By default, cancels at the end of the billing period.
   * The subscription will remain active until then.
   *
   * @param subscriptionId - Optional specific subscription ID to cancel
   */
  async function cancel(subscriptionId?: string): Promise<void> {
    if (!client?.subscription) {
      throw new Error('@crouton/auth: Stripe client not available')
    }

    const subId = subscriptionId ?? subscription.value?.id
    if (!subId) {
      throw new Error('No subscription to cancel')
    }

    loading.value = true
    error.value = null
    try {
      const result = await client.subscription.cancel({
        subscriptionId: subId,
        returnUrl: window.location.href,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Cancellation failed')
      }

      // Refresh subscription data
      await fetchSubscriptions()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Cancellation failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Restore a canceled subscription
   *
   * Only works if the subscription is set to cancel at period end
   * but hasn't actually ended yet.
   *
   * @param subscriptionId - Optional specific subscription ID to restore
   */
  async function restore(subscriptionId?: string): Promise<void> {
    if (!client?.subscription) {
      throw new Error('@crouton/auth: Stripe client not available')
    }

    const subId = subscriptionId ?? subscription.value?.id
    if (!subId) {
      throw new Error('No subscription to restore')
    }

    loading.value = true
    error.value = null
    try {
      const result = await client.subscription.restore({
        subscriptionId: subId,
      })

      if (result.error) {
        throw new Error(result.error.message || 'Restore failed')
      }

      // Refresh subscription data
      await fetchSubscriptions()
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Restore failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Change to a different plan
   *
   * Redirects to Stripe Checkout for plan change.
   * Proration is handled by Stripe.
   *
   * @param newPlanId - The plan ID to change to
   * @param options - Checkout options
   */
  async function changePlan(newPlanId: string, options: CheckoutOptions = {}): Promise<void> {
    // Use checkout flow for plan changes
    return checkout(newPlanId, options)
  }

  /**
   * Check if a specific plan is the current plan
   */
  function isCurrentPlan(planId: string): boolean {
    return subscription.value?.plan === planId
  }

  /**
   * Get a plan by ID
   */
  function getPlan(planId: string): Plan | undefined {
    return plans.value.find((p) => p.id === planId)
  }

  // Auto-fetch subscriptions on mount (if on client)
  if (import.meta.client) {
    onMounted(() => {
      fetchSubscriptions()
    })
  }

  return {
    // State
    enabled,
    subscription: readonly(subscription),
    subscriptions: readonly(subscriptions),
    plan: readonly(plan),
    plans: readonly(plans),
    loading: readonly(loading),
    error: readonly(error),

    // Status computed
    status,
    billingMode,
    isPro,
    isTrialing,
    isCanceled,
    isPastDue,
    trialEndsAt,
    currentPeriodEnd,
    cancelAtPeriodEnd,

    // Methods
    fetchSubscriptions,
    checkout,
    portal,
    cancel,
    restore,
    changePlan,

    // Helpers
    isCurrentPlan,
    getPlan,
  }
}

/**
 * Create a stub for when billing is disabled
 */
function createDisabledBillingStub() {
  const warnDisabled = () => console.warn('@crouton/auth: Billing is not enabled')

  return {
    // State
    enabled: computed(() => false),
    subscription: computed(() => null),
    subscriptions: computed(() => []),
    plan: computed(() => null),
    plans: computed(() => []),
    loading: computed(() => false),
    error: computed(() => null),

    // Status computed
    status: computed(() => null),
    billingMode: computed(() => 'user' as const),
    isPro: computed(() => false),
    isTrialing: computed(() => false),
    isCanceled: computed(() => false),
    isPastDue: computed(() => false),
    trialEndsAt: computed(() => null),
    currentPeriodEnd: computed(() => null),
    cancelAtPeriodEnd: computed(() => false),

    // Stub methods
    fetchSubscriptions: async () => { warnDisabled() },
    checkout: async (_planId: string, _options?: CheckoutOptions) => { warnDisabled() },
    portal: async (_options?: PortalOptions) => { warnDisabled() },
    cancel: async () => { warnDisabled() },
    restore: async () => { warnDisabled() },
    changePlan: async (_newPlanId: string, _options?: CheckoutOptions) => { warnDisabled() },

    // Helpers
    isCurrentPlan: (_planId: string) => false,
    getPlan: (_planId: string) => undefined,
  }
}
