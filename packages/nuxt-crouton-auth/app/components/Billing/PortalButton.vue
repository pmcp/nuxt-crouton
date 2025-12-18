<script setup lang="ts">
/**
 * Portal Button Component
 *
 * Button to open the Stripe Customer Portal.
 * Allows customers to manage their subscription, update payment methods, etc.
 *
 * @example
 * ```vue
 * <BillingPortalButton label="Manage Billing" />
 * ```
 */
import type { PortalOptions } from '../../composables/useBilling'

interface Props {
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
  /** Portal options */
  portalOptions?: PortalOptions
  /** Show icon */
  showIcon?: boolean
  /** Disabled state */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Manage Billing',
  color: 'neutral',
  variant: 'outline',
  size: 'md',
  block: false,
  portalOptions: undefined,
  showIcon: true,
  disabled: false,
})

const emit = defineEmits<{
  click: []
  error: [error: Error]
}>()

const toast = useToast()
const { enabled, portal, subscription } = useBilling()

const isLoading = ref(false)

// Button disabled state
const buttonDisabled = computed(() => {
  return props.disabled || !enabled.value || !subscription.value || isLoading.value
})

// Handle portal redirect
const handlePortal = async () => {
  if (buttonDisabled.value) return

  isLoading.value = true

  try {
    await portal(props.portalOptions)
    emit('click')
  }
  catch (error: unknown) {
    const err = error instanceof Error ? error : new Error('Failed to open billing portal')
    emit('error', err)
    toast.add({
      title: 'Error',
      description: err.message,
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UButton
    v-if="enabled && subscription"
    :label="label"
    :color="color"
    :variant="variant"
    :size="size"
    :block="block"
    :loading="isLoading"
    :disabled="buttonDisabled"
    :icon="showIcon ? 'i-lucide-external-link' : undefined"
    trailing
    @click="handlePortal"
  />
</template>
