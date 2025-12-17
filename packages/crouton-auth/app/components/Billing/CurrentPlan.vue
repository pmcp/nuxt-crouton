<script setup lang="ts">
/**
 * Current Plan Component
 *
 * Displays the current subscription status and plan details.
 * Shows trial information, cancellation status, and renewal dates.
 *
 * @example
 * ```vue
 * <BillingCurrentPlan
 *   @manage="handleManage"
 *   @cancel="handleCancel"
 * />
 * ```
 */
interface Props {
  /** Show management actions */
  showActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showActions: true,
})

const emit = defineEmits<{
  manage: []
  cancel: []
  restore: []
}>()

const {
  enabled,
  subscription,
  plan,
  status,
  isPro,
  isTrialing,
  isCanceled,
  isPastDue,
  trialEndsAt,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  loading,
} = useBilling()

// Format dates
const formatDate = (date: Date | null) => {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(date))
}

// Trial days remaining
const trialDaysRemaining = computed(() => {
  if (!trialEndsAt.value) return 0
  const now = new Date()
  const end = new Date(trialEndsAt.value)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
})

// Status badge color
const statusColor = computed(() => {
  switch (status.value) {
    case 'active':
      return 'success'
    case 'trialing':
      return 'info'
    case 'canceled':
      return 'neutral'
    case 'past_due':
      return 'error'
    default:
      return 'neutral'
  }
})

// Status label
const statusLabel = computed(() => {
  if (cancelAtPeriodEnd.value && status.value !== 'canceled') {
    return 'Canceling'
  }
  switch (status.value) {
    case 'active':
      return 'Active'
    case 'trialing':
      return 'Trial'
    case 'canceled':
      return 'Canceled'
    case 'past_due':
      return 'Past Due'
    case 'incomplete':
      return 'Incomplete'
    case 'paused':
      return 'Paused'
    default:
      return 'Unknown'
  }
})
</script>

<template>
  <UCard v-if="enabled">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          Current Plan
        </h3>
        <UBadge
          v-if="subscription"
          :color="statusColor"
          size="sm"
        >
          {{ statusLabel }}
        </UBadge>
      </div>
    </template>

    <!-- Has Subscription -->
    <div v-if="subscription && plan" class="space-y-4">
      <!-- Plan Name & Price -->
      <div>
        <h4 class="text-xl font-bold">
          {{ plan.name }}
        </h4>
        <p class="text-muted">
          {{ plan.description }}
        </p>
      </div>

      <!-- Trial Info -->
      <UAlert
        v-if="isTrialing"
        color="info"
        icon="i-lucide-clock"
      >
        <template #title>
          Trial Period
        </template>
        <template #description>
          {{ trialDaysRemaining }} day{{ trialDaysRemaining !== 1 ? 's' : '' }} remaining.
          Your trial ends on {{ formatDate(trialEndsAt) }}.
        </template>
      </UAlert>

      <!-- Past Due Warning -->
      <UAlert
        v-if="isPastDue"
        color="error"
        icon="i-lucide-alert-circle"
      >
        <template #title>
          Payment Failed
        </template>
        <template #description>
          Please update your payment method to continue your subscription.
        </template>
      </UAlert>

      <!-- Cancellation Notice -->
      <UAlert
        v-if="cancelAtPeriodEnd && !isCanceled"
        color="warning"
        icon="i-lucide-calendar-x"
      >
        <template #title>
          Subscription Ending
        </template>
        <template #description>
          Your subscription will end on {{ formatDate(currentPeriodEnd) }}.
          <UButton
            variant="link"
            size="xs"
            class="ml-1"
            @click="emit('restore')"
          >
            Restore subscription
          </UButton>
        </template>
      </UAlert>

      <!-- Renewal Date -->
      <div
        v-if="isPro && !cancelAtPeriodEnd"
        class="text-sm text-muted"
      >
        <UIcon name="i-lucide-calendar" class="inline size-4 mr-1" />
        Next billing date: {{ formatDate(currentPeriodEnd) }}
      </div>
    </div>

    <!-- No Subscription -->
    <div v-else class="text-center py-6">
      <UIcon
        name="i-lucide-credit-card"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <p class="text-lg font-medium">
        No active subscription
      </p>
      <p class="text-sm text-muted mt-1">
        Choose a plan to get started
      </p>
    </div>

    <!-- Actions -->
    <template v-if="showActions && subscription" #footer>
      <div class="flex flex-wrap gap-2">
        <BillingPortalButton
          size="sm"
          variant="outline"
          @click="emit('manage')"
        />

        <UButton
          v-if="!cancelAtPeriodEnd && status !== 'canceled'"
          label="Cancel Subscription"
          size="sm"
          color="neutral"
          variant="ghost"
          @click="emit('cancel')"
        />

        <UButton
          v-if="cancelAtPeriodEnd"
          label="Restore Subscription"
          size="sm"
          color="primary"
          variant="soft"
          @click="emit('restore')"
        />
      </div>
    </template>
  </UCard>
</template>
