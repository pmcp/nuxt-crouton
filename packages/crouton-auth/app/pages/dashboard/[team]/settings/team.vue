<script setup lang="ts">
/**
 * Team Settings Page
 *
 * Team configuration settings including name, slug, and logo.
 * Only accessible in multi-tenant mode by team admins/owners.
 *
 * @route /dashboard/settings/team (single-tenant) or /dashboard/:team/settings/team (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const { showTeamManagement, currentTeam, isAdmin, deleteTeam } = useTeam()
const { buildDashboardUrl } = useTeamContext()
const toast = useToast()
const router = useRouter()

// Show delete confirmation modal
const showDeleteModal = ref(false)

// Handle team deletion
async function handleDelete() {
  try {
    await deleteTeam()
    toast.add({
      title: 'Team deleted',
      description: 'The team has been permanently deleted.',
      color: 'success',
    })
    // Redirect to dashboard root (will need to select new team)
    await navigateTo('/dashboard')
  }
  catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to delete team'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
}

// Handle saved event from TeamSettings component
function handleSaved() {
  // Could do additional logic here like refreshing data
}
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

      <h1 class="text-2xl font-bold">Team Settings</h1>
      <p class="text-muted mt-1">
        Manage your team's profile and configuration.
      </p>
    </div>

    <!-- Team management not available -->
    <UCard v-if="!showTeamManagement" class="text-center py-8">
      <UIcon
        name="i-lucide-building-2"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">Team Management Not Available</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">
        Team management is only available in multi-tenant mode.
        Your app is configured for single-tenant or personal mode.
      </p>
      <NuxtLink :to="buildDashboardUrl('/settings')">
        <UButton label="Go to Account Settings" variant="outline" class="mt-4" />
      </NuxtLink>
    </UCard>

    <!-- Not a team admin -->
    <UCard v-else-if="!isAdmin" class="text-center py-8">
      <UIcon
        name="i-lucide-shield-alert"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">Access Restricted</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">
        Only team owners and admins can modify team settings.
        Contact your team owner for access.
      </p>
      <NuxtLink :to="buildDashboardUrl('/settings')">
        <UButton label="Go to Account Settings" variant="outline" class="mt-4" />
      </NuxtLink>
    </UCard>

    <!-- Team Settings Form -->
    <template v-else>
      <UCard>
        <TeamSettings
          @saved="handleSaved"
          @delete="showDeleteModal = true"
        />
      </UCard>

      <!-- Delete Confirmation Modal -->
      <TeamDeleteConfirm
        v-if="currentTeam"
        v-model:open="showDeleteModal"
        :team-name="currentTeam.name"
        @confirm="handleDelete"
      />
    </template>
  </div>
</template>
