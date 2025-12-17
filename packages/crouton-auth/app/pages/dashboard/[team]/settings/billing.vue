<script setup lang="ts">
/**
 * Billing Settings Page
 *
 * Subscription management and billing settings.
 * Shows current plan, allows upgrading, and provides access to Stripe portal.
 *
 * @route /dashboard/settings/billing (single-tenant/personal) or /dashboard/:team/settings/billing (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const { buildDashboardUrl } = useTeamContext()
const toast = useToast()

const {
  enabled,
  subscription,
  plan,
  plans,
  loading,
  cancel,
  restore,
  portal,
} = useBilling()

// Cancel confirmation modal
const showCancelModal = ref(false)
const cancelLoading = ref(false)

// Handle cancel subscription
async function handleCancel() {
  cancelLoading.value = true
  try {
    await cancel()
    showCancelModal.value = false
    toast.add({
      title: 'Subscription cancelled',
      description: 'Your subscription will end at the current billing period.',
      color: 'success',
    })
  }
  catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to cancel subscription'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
  finally {
    cancelLoading.value = false
  }
}

// Handle restore subscription
async function handleRestore() {
  try {
    await restore()
    toast.add({
      title: 'Subscription restored',
      description: 'Your subscription has been restored.',
      color: 'success',
    })
  }
  catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to restore subscription'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Handle manage billing (open Stripe portal)
async function handleManage() {
  try {
    await portal()
  }
  catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to open billing portal'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Header with back link -->
    <div>
      <NuxtLink
        :to="buildDashboardUrl('/settings')"
        class="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Back to Account Settings
      </NuxtLink>

      <h1 class="text-2xl font-bold">Billing & Subscription</h1>
      <p class="text-muted mt-1">
        Manage your subscription and billing information.
      </p>
    </div>

    <!-- Billing not enabled -->
    <UCard v-if="!enabled" class="text-center py-8">
      <UIcon
        name="i-lucide-credit-card-off"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">Billing Not Enabled</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">
        Billing features are not enabled for this application.
        Contact your administrator for more information.
      </p>
      <NuxtLink :to="buildDashboardUrl('/settings')">
        <UButton label="Go to Account Settings" variant="outline" class="mt-4" />
      </NuxtLink>
    </UCard>

    <!-- Billing Content -->
    <template v-else>
      <!-- Current Plan Card -->
      <BillingCurrentPlan
        @manage="handleManage"
        @cancel="showCancelModal = true"
        @restore="handleRestore"
      />

      <!-- Available Plans -->
      <div v-if="plans.length > 0" class="space-y-4">
        <h2 class="text-xl font-semibold">
          {{ subscription ? 'Change Plan' : 'Choose a Plan' }}
        </h2>
        <BillingPricingTable />
      </div>

      <!-- Usage Display (if subscription exists) -->
      <BillingUsageDisplay v-if="subscription" />

      <!-- Payment Methods & Invoice History -->
      <UCard v-if="subscription">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-muted">
              <UIcon name="i-lucide-receipt" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Payment & Invoices</h2>
              <p class="text-sm text-muted">Manage payment methods and view invoices</p>
            </div>
          </div>
        </template>

        <div class="flex flex-col sm:flex-row gap-4">
          <BillingPortalButton variant="outline" class="flex-1">
            <template #default>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-credit-card" class="size-4" />
                Update Payment Method
              </div>
            </template>
          </BillingPortalButton>

          <BillingPortalButton variant="outline" class="flex-1">
            <template #default>
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-file-text" class="size-4" />
                View Invoice History
              </div>
            </template>
          </BillingPortalButton>
        </div>
      </UCard>

      <!-- Cancel Confirmation Modal -->
      <UModal v-model:open="showCancelModal">
        <template #header>
          <h3 class="text-lg font-semibold text-error">Cancel Subscription</h3>
        </template>

        <div class="p-4 space-y-4">
          <p class="text-muted">
            Are you sure you want to cancel your subscription? You'll continue to have access
            until the end of your current billing period.
          </p>

          <UAlert
            color="warning"
            icon="i-lucide-alert-triangle"
            title="You'll lose access to:"
          >
            <template #description>
              <ul class="list-disc list-inside mt-2 space-y-1">
                <li v-for="feature in plan?.features" :key="feature">
                  {{ feature }}
                </li>
              </ul>
            </template>
          </UAlert>

          <div class="flex justify-end gap-3 pt-4">
            <UButton
              label="Keep Subscription"
              variant="outline"
              :disabled="cancelLoading"
              @click="showCancelModal = false"
            />
            <UButton
              label="Cancel Subscription"
              color="error"
              :loading="cancelLoading"
              @click="handleCancel"
            />
          </div>
        </div>
      </UModal>
    </template>
  </div>
</template>
