<script setup lang="ts">
/**
 * Upgrade Button Component
 *
 * Button to start a Stripe Checkout session for a specific plan.
 * Handles loading state and checkout flow.
 *
 * @example
 * ```vue
 * <BillingUpgradeButton
 *   plan-id="pro"
 *   label="Upgrade to Pro"
 * />
 * ```
 */
import type { CheckoutOptions } from '../../composables/useBilling'

interface Props {
  /** Plan ID to checkout */
  planId: string
  /** Button label */
  label?: string
  /** Button color */
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  /** Button variant */
  variant?: 'solid' | 'outline' | 'soft' | 'subtle' | 'ghost' | 'link'
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Full width button */
  block?: boolean
  /** Checkout options */
  checkoutOptions?: CheckoutOptions
  /** Disabled state */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Upgrade',
  color: 'primary',
  variant: 'solid',
  size: 'md',
  block: false,
  checkoutOptions: undefined,
  disabled: false,
})

const emit = defineEmits<{
  checkout: []
  error: [error: Error]
}>()

const toast = useToast()
const { enabled, checkout, isCurrentPlan, loading, getPlan } = useBilling()

const isCheckingOut = ref(false)

// Get plan details
const plan = computed(() => getPlan(props.planId))

// Button disabled state
const buttonDisabled = computed(() => {
  return (
    props.disabled
    || !enabled.value
    || isCheckingOut.value
    || isCurrentPlan(props.planId)
  )
})

// Handle checkout
const handleCheckout = async () => {
  if (buttonDisabled.value) return

  isCheckingOut.value = true

  try {
    await checkout(props.planId, props.checkoutOptions)
    emit('checkout')
  }
  catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Checkout failed')
    emit('error', err)
    toast.add({
      title: 'Checkout Error',
      description: err.message,
      color: 'error',
    })
  }
  finally {
    isCheckingOut.value = false
  }
}
</script>

<template>
  <UButton
    v-if="enabled"
    :label="isCurrentPlan(planId) ? 'Current Plan' : label"
    :color="color"
    :variant="isCurrentPlan(planId) ? 'outline' : variant"
    :size="size"
    :block="block"
    :loading="isCheckingOut"
    :disabled="buttonDisabled"
    :icon="!isCurrentPlan(planId) ? 'i-lucide-arrow-up-right' : undefined"
    trailing
    @click="handleCheckout"
  />
</template>
