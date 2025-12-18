<script setup lang="ts">
/**
 * Dashboard Index Page
 *
 * Landing page for the dashboard. Shows a brief overview and quick links.
 * In most apps, this will be overridden by the consumer's own dashboard.
 *
 * @route /dashboard (single-tenant/personal) or /dashboard/:team (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const { user } = useSession()
const { currentTeam, showTeamManagement } = useTeam()
const { enabled: billingEnabled, subscription, isPro, isTrialing } = useBilling()
const { buildDashboardUrl } = useTeamContext()

// Quick stats/links
const quickLinks = computed(() => {
  const links = [
    {
      label: 'Account Settings',
      description: 'Manage your profile, password, and security',
      icon: 'i-lucide-settings',
      to: buildDashboardUrl('/settings'),
    },
  ]

  if (showTeamManagement.value) {
    links.push(
      {
        label: 'Team Settings',
        description: 'Update team name, logo, and preferences',
        icon: 'i-lucide-building-2',
        to: buildDashboardUrl('/settings/team'),
      },
      {
        label: 'Team Members',
        description: 'Invite and manage team members',
        icon: 'i-lucide-users',
        to: buildDashboardUrl('/settings/members'),
      },
    )
  }

  if (billingEnabled.value) {
    links.push({
      label: 'Billing',
      description: 'Manage your subscription and payment method',
      icon: 'i-lucide-credit-card',
      to: buildDashboardUrl('/settings/billing'),
    })
  }

  return links
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Welcome Header -->
    <div>
      <h1 class="text-3xl font-bold">
        Welcome back, {{ user?.name || 'there' }}!
      </h1>
      <p class="text-muted mt-2">
        <template v-if="currentTeam && showTeamManagement">
          You're working in <strong>{{ currentTeam.name }}</strong>.
        </template>
        <template v-else>
          Manage your account and settings below.
        </template>
      </p>
    </div>

    <!-- Subscription Status (if billing enabled) -->
    <UCard v-if="billingEnabled && subscription">
      <div class="flex items-center gap-4">
        <div class="p-3 rounded-full bg-primary/10">
          <UIcon
            :name="isPro ? 'i-lucide-crown' : 'i-lucide-clock'"
            class="size-6 text-primary"
          />
        </div>
        <div class="flex-1">
          <p class="font-medium">
            <template v-if="isTrialing">
              Trial Active
            </template>
            <template v-else-if="isPro">
              Pro Plan Active
            </template>
            <template v-else>
              Free Plan
            </template>
          </p>
          <p class="text-sm text-muted">
            <template v-if="isTrialing">
              Your trial gives you access to all premium features.
            </template>
            <template v-else-if="isPro">
              You have full access to all premium features.
            </template>
            <template v-else>
              Upgrade to unlock premium features.
            </template>
          </p>
        </div>
        <NuxtLink :to="buildDashboardUrl('/settings/billing')">
          <UButton
            :label="isPro ? 'Manage' : 'Upgrade'"
            :variant="isPro ? 'outline' : 'solid'"
            size="sm"
          />
        </NuxtLink>
      </div>
    </UCard>

    <!-- Quick Links Grid -->
    <div>
      <h2 class="text-lg font-semibold mb-4">
        Quick Access
      </h2>
      <div class="grid gap-4 sm:grid-cols-2">
        <NuxtLink
          v-for="link in quickLinks"
          :key="link.to"
          :to="link.to"
        >
          <UCard
            class="h-full hover:border-primary/50 hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <div class="flex items-start gap-4">
              <div class="p-2 rounded-lg bg-muted">
                <UIcon :name="link.icon" class="size-5" />
              </div>
              <div>
                <p class="font-medium">{{ link.label }}</p>
                <p class="text-sm text-muted mt-1">{{ link.description }}</p>
              </div>
            </div>
          </UCard>
        </NuxtLink>
      </div>
    </div>

    <!-- Getting Started (if no subscription) -->
    <UCard v-if="billingEnabled && !subscription" class="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div class="text-center py-4">
        <UIcon name="i-lucide-rocket" class="size-12 mx-auto mb-4 text-primary" />
        <h3 class="text-xl font-bold mb-2">
          Get Started with Pro
        </h3>
        <p class="text-muted mb-6 max-w-md mx-auto">
          Unlock all premium features and take your productivity to the next level.
        </p>
        <NuxtLink :to="buildDashboardUrl('/settings/billing')">
          <UButton label="View Plans" size="lg" />
        </NuxtLink>
      </div>
    </UCard>
  </div>
</template>
