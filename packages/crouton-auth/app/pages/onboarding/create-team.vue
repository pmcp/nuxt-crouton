<script setup lang="ts">
/**
 * Create Team Onboarding Page
 *
 * Shown to new users in multi-tenant mode who don't have any teams yet.
 * Uses the TeamCreateForm component to handle team creation.
 */
import type { Team } from '../../../types'

definePageMeta({
  middleware: 'auth',
  layout: 'auth'
})

const { t } = useT()

const navigating = ref(false)

function onTeamCreated(team: Team) {
  // Show loading during navigation
  navigating.value = true
  // Force full page load so SSR picks up the fresh session with active org
  // Navigate to admin since the team has no public pages yet
  navigateTo(`/admin/${team.slug}`, { external: true })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-6 bg-default">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <UIcon name="i-lucide-building-2" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 class="text-lg font-semibold">
              {{ t('onboarding.createTeamTitle', 'Create Your First Team') }}
            </h1>
            <p class="text-sm text-muted">
              {{ t('onboarding.createTeamDescription', 'Get started by creating a workspace for your projects.') }}
            </p>
          </div>
        </div>
      </template>

      <TeamCreateForm :loading="navigating" @success="onTeamCreated" />
    </UCard>
  </div>
</template>
