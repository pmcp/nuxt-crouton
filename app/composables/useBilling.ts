/**
 * useBilling Composable
 *
 * Billing and subscription management with Stripe integration.
 *
 * @example
 * ```vue
 * <script setup>
 * const { subscription, isPro, checkout, portal } = useBilling()
 * </script>
 * ```
 */
import type { Subscription, SubscriptionStatus } from '../../types'

export interface Plan {
  id: string
  name: string
  description?: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features?: string[]
}

export function useBilling() {
  const config = useRuntimeConfig().public.crouton?.auth

  // Check if billing is enabled
  const enabled = computed(() => config?.billing?.enabled === true)

  // Return stub if billing not enabled
  if (!enabled.value) {
    return {
      enabled,
      subscription: computed(() => null),
      plan: computed(() => null),
      status: computed(() => null),

      // Stub methods that warn
      checkout: async (_planId: string) => {
        console.warn('@crouton/auth: Billing is not enabled')
      },
      portal: async () => {
        console.warn('@crouton/auth: Billing is not enabled')
      },
      cancel: async () => {
        console.warn('@crouton/auth: Billing is not enabled')
      },
      resume: async () => {
        console.warn('@crouton/auth: Billing is not enabled')
      },

      // Status flags
      isPro: computed(() => false),
      isTrialing: computed(() => false),
      isCanceled: computed(() => false),
      isPastDue: computed(() => false),
    }
  }

  // TODO: Phase 4 - Connect to Better Auth Stripe client
  // const client = useBetterAuthClient()

  // Reactive state (placeholders)
  const subscription = ref<Subscription | null>(null)
  const plan = ref<Plan | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed status
  const status = computed<SubscriptionStatus | null>(() => subscription.value?.status ?? null)

  const isPro = computed(() => {
    return subscription.value?.status === 'active' || subscription.value?.status === 'trialing'
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
    return subscription.value?.currentPeriodEnd ?? null
  })

  // Billing methods (placeholders - to be implemented in Phase 4)
  async function checkout(_planId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth Stripe plugin
      // Redirects to Stripe Checkout
      throw new Error('@crouton/auth: Checkout not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Checkout failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function portal(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth Stripe plugin
      // Redirects to Stripe Customer Portal
      throw new Error('@crouton/auth: Portal not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Portal redirect failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function cancel(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth Stripe plugin
      throw new Error('@crouton/auth: Cancel subscription not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Cancellation failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function resume(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth Stripe plugin
      throw new Error('@crouton/auth: Resume subscription not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Resume failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function changePlan(_newPlanId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      // TODO: Phase 4 - Implement with Better Auth Stripe plugin
      throw new Error('@crouton/auth: Change plan not yet implemented. Complete Phase 4.')
    }
    catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Plan change failed'
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    // State
    enabled,
    subscription: readonly(subscription),
    plan: readonly(plan),
    loading: readonly(loading),
    error: readonly(error),

    // Status computed
    status,
    isPro,
    isTrialing,
    isCanceled,
    isPastDue,
    trialEndsAt,
    currentPeriodEnd,

    // Methods
    checkout,
    portal,
    cancel,
    resume,
    changePlan,
  }
}
