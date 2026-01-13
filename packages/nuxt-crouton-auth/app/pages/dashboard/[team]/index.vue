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
  layout: 'dashboard'
})

const { user } = useSession()
const { currentTeam, showTeamManagement } = useTeam()
const { buildDashboardUrl } = useTeamContext()

// Quick stats/links
const quickLinks = computed(() => {
  const links = [
    {
      label: 'Account Settings',
      description: 'Manage your profile, password, and security',
      icon: 'i-lucide-settings',
      to: buildDashboardUrl('/settings')
    }
  ]

  if (showTeamManagement.value) {
    links.push(
      {
        label: 'Team Settings',
        description: 'Update team name, logo, and preferences',
        icon: 'i-lucide-building-2',
        to: buildDashboardUrl('/settings/team')
      },
      {
        label: 'Team Members',
        description: 'Invite and manage team members',
        icon: 'i-lucide-users',
        to: buildDashboardUrl('/settings/members')
      }
    )
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
                <UIcon
                  :name="link.icon"
                  class="size-5"
                />
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
  </div>
</template>
