<script setup lang="ts">
/**
 * Security Settings Page
 *
 * Security-related settings including 2FA and passkeys.
 * Shows a dedicated view for security features without the account tabs.
 *
 * @route /dashboard/settings/security (single-tenant/personal) or /dashboard/:team/settings/security (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const { hasPassword, hasPasskeys, has2FA } = useAuth()
const { buildDashboardUrl } = useTeamContext()

// Check if any security features are enabled
const hasSecurityFeatures = computed(() => {
  return hasPasskeys.value || has2FA.value
})
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8">
    <!-- Header with back link -->
    <div>
      <NuxtLink
        :to="buildDashboardUrl('/settings')"
        class="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        Back to Account Settings
      </NuxtLink>

      <h1 class="text-2xl font-bold">Security Settings</h1>
      <p class="text-muted mt-1">
        Manage your account security with two-factor authentication and passkeys.
      </p>
    </div>

    <!-- No security features enabled -->
    <UCard v-if="!hasSecurityFeatures" class="text-center py-8">
      <UIcon
        name="i-lucide-shield-off"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">No Security Features Enabled</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">
        Security features like two-factor authentication and passkeys are not enabled
        for this application. Contact your administrator to enable them.
      </p>
    </UCard>

    <!-- Security Features -->
    <template v-else>
      <!-- Password Section -->
      <UCard v-if="hasPassword">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-muted">
              <UIcon name="i-lucide-lock" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Password</h2>
              <p class="text-sm text-muted">Update your account password</p>
            </div>
          </div>
        </template>

        <AccountPasswordForm />
      </UCard>

      <!-- Two-Factor Authentication -->
      <UCard v-if="has2FA">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-muted">
              <UIcon name="i-lucide-smartphone" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Two-Factor Authentication</h2>
              <p class="text-sm text-muted">Add an extra layer of security with 2FA</p>
            </div>
          </div>
        </template>

        <AccountTwoFactorSetup />
      </UCard>

      <!-- Passkeys -->
      <UCard v-if="hasPasskeys">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-lg bg-muted">
              <UIcon name="i-lucide-key" class="size-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold">Passkeys</h2>
              <p class="text-sm text-muted">Sign in securely without a password</p>
            </div>
          </div>
        </template>

        <AccountPasskeyManager />
      </UCard>
    </template>
  </div>
</template>
