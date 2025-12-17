<script setup lang="ts">
/**
 * Pricing Table Component
 *
 * Displays all available plans in a responsive grid.
 * Handles plan selection and checkout flow.
 *
 * @example
 * ```vue
 * <BillingPricingTable
 *   :recommended-plan="'pro'"
 *   @checkout="handleCheckout"
 * />
 * ```
 */
import type { Plan, CheckoutOptions } from '../../composables/useBilling'

interface Props {
  /** ID of the recommended plan to highlight */
  recommendedPlan?: string
  /** Options to pass to checkout */
  checkoutOptions?: CheckoutOptions
  /** Show annual toggle */
  showAnnualToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  recommendedPlan: undefined,
  checkoutOptions: undefined,
  showAnnualToggle: false,
})

const emit = defineEmits<{
  checkout: [plan: Plan]
}>()

const toast = useToast()
const {
  enabled,
  plans,
  subscription,
  loading,
  checkout,
  isCurrentPlan,
} = useBilling()

// Selected plan for checkout
const selectedPlan = ref<string | null>(null)
const checkoutLoading = ref(false)

// Annual billing toggle
const useAnnual = ref(false)

// Filter plans by interval when toggle is shown
const displayPlans = computed(() => {
  if (!props.showAnnualToggle) {
    return plans.value
  }
  const interval = useAnnual.value ? 'year' : 'month'
  return plans.value.filter(p => p.interval === interval)
})

// Handle plan selection
const handleSelectPlan = async (plan: Plan) => {
  if (isCurrentPlan(plan.id)) {
    return
  }

  selectedPlan.value = plan.id
  checkoutLoading.value = true

  try {
    await checkout(plan.id, {
      ...props.checkoutOptions,
      annual: useAnnual.value,
    })
    emit('checkout', plan)
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start checkout'
    toast.add({
      title: 'Checkout Error',
      description: message,
      color: 'error',
    })
  }
  finally {
    checkoutLoading.value = false
    selectedPlan.value = null
  }
}
</script>

<template>
  <div v-if="enabled" class="space-y-6">
    <!-- Annual Toggle -->
    <div
      v-if="showAnnualToggle"
      class="flex items-center justify-center gap-3"
    >
      <span :class="['text-sm', !useAnnual ? 'font-semibold' : 'text-muted']">
        Monthly
      </span>
      <USwitch v-model="useAnnual" />
      <span :class="['text-sm', useAnnual ? 'font-semibold' : 'text-muted']">
        Yearly
        <UBadge color="success" size="xs" class="ml-1">
          Save 20%
        </UBadge>
      </span>
    </div>

    <!-- Plans Grid -->
    <div
      :class="[
        'grid gap-6',
        displayPlans.length === 1 ? 'max-w-md mx-auto' : '',
        displayPlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto' : '',
        displayPlans.length >= 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : '',
      ]"
    >
      <BillingPlanCard
        v-for="plan in displayPlans"
        :key="plan.id"
        :plan="plan"
        :current="isCurrentPlan(plan.id)"
        :recommended="plan.id === recommendedPlan"
        :loading="loading || (checkoutLoading && selectedPlan === plan.id)"
        :disabled="checkoutLoading && selectedPlan !== plan.id"
        @select="handleSelectPlan"
      />
    </div>

    <!-- No Plans State -->
    <div
      v-if="displayPlans.length === 0"
      class="text-center py-12 text-muted"
    >
      <UIcon name="i-lucide-credit-card" class="size-12 mx-auto mb-4 opacity-50" />
      <p>No plans available</p>
    </div>
  </div>

  <!-- Billing Not Enabled -->
  <div
    v-else
    class="text-center py-12 text-muted"
  >
    <UIcon name="i-lucide-credit-card-off" class="size-12 mx-auto mb-4 opacity-50" />
    <p>Billing is not enabled</p>
  </div>
</template>
