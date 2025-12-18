<script setup lang="ts">
/**
 * Plan Card Component
 *
 * Displays a single pricing plan with features and pricing.
 * Used in pricing tables and plan selection.
 *
 * @example
 * ```vue
 * <BillingPlanCard
 *   :plan="plan"
 *   :current="isCurrentPlan"
 *   @select="handleSelect"
 * />
 * ```
 */
import type { Plan } from '../../composables/useBilling'

interface Props {
  /** Plan data to display */
  plan: Plan
  /** Whether this is the current plan */
  current?: boolean
  /** Whether this plan is recommended */
  recommended?: boolean
  /** Loading state */
  loading?: boolean
  /** Disable selection */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  current: false,
  recommended: false,
  loading: false,
  disabled: false,
})

const emit = defineEmits<{
  select: [plan: Plan]
}>()

// Format price for display
const formattedPrice = computed(() => {
  const price = props.plan.price / 100 // Convert from cents
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: props.plan.currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(price)
})

// Interval display
const intervalLabel = computed(() => {
  return props.plan.interval === 'year' ? '/year' : '/month'
})

// Button state
const buttonDisabled = computed(() => {
  return props.disabled || props.loading || props.current
})

const buttonLabel = computed(() => {
  if (props.current) return 'Current Plan'
  if (props.loading) return 'Loading...'
  return 'Select Plan'
})
</script>

<template>
  <UCard
    :class="[
      'relative transition-all duration-200',
      recommended ? 'ring-2 ring-primary scale-105' : '',
      current ? 'bg-primary/5' : '',
    ]"
  >
    <!-- Recommended Badge -->
    <div
      v-if="recommended"
      class="absolute -top-3 left-1/2 -translate-x-1/2"
    >
      <UBadge color="primary" size="sm">
        Recommended
      </UBadge>
    </div>

    <!-- Current Badge -->
    <div
      v-if="current"
      class="absolute -top-3 left-1/2 -translate-x-1/2"
    >
      <UBadge color="success" size="sm">
        Current
      </UBadge>
    </div>

    <template #header>
      <div class="text-center">
        <h3 class="text-lg font-semibold">
          {{ plan.name }}
        </h3>
        <p
          v-if="plan.description"
          class="text-sm text-muted mt-1"
        >
          {{ plan.description }}
        </p>
      </div>
    </template>

    <!-- Price -->
    <div class="text-center py-4">
      <div class="flex items-baseline justify-center gap-1">
        <span class="text-4xl font-bold">
          {{ formattedPrice }}
        </span>
        <span class="text-muted">
          {{ intervalLabel }}
        </span>
      </div>
    </div>

    <!-- Features -->
    <ul
      v-if="plan.features?.length"
      class="space-y-3 my-4"
    >
      <li
        v-for="feature in plan.features"
        :key="feature"
        class="flex items-start gap-2"
      >
        <UIcon
          name="i-lucide-check"
          class="size-5 text-success shrink-0 mt-0.5"
        />
        <span class="text-sm">{{ feature }}</span>
      </li>
    </ul>

    <template #footer>
      <UButton
        :label="buttonLabel"
        :loading="loading"
        :disabled="buttonDisabled"
        :color="recommended ? 'primary' : 'neutral'"
        :variant="current ? 'outline' : 'solid'"
        block
        @click="emit('select', plan)"
      />
    </template>
  </UCard>
</template>
