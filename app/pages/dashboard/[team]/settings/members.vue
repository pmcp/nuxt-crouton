<script setup lang="ts">
/**
 * Team Members Page
 *
 * Manage team members and invitations.
 * Only accessible in multi-tenant mode.
 *
 * @route /dashboard/settings/members (single-tenant) or /dashboard/:team/settings/members (multi-tenant)
 */
definePageMeta({
  middleware: ['auth'],
  layout: 'dashboard',
})

const { showTeamManagement, canInviteMembers } = useTeam()
const { buildDashboardUrl } = useTeamContext()

// Show invite modal
const showInviteModal = ref(false)

// Handle invite button click
function handleInvite() {
  showInviteModal.value = true
}

// Handle successful invite
function handleInvited() {
  showInviteModal.value = false
  // Members list will auto-refresh from the component
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

      <h1 class="text-2xl font-bold">Team Members</h1>
      <p class="text-muted mt-1">
        Manage team members and send invitations.
      </p>
    </div>

    <!-- Team management not available -->
    <UCard v-if="!showTeamManagement" class="text-center py-8">
      <UIcon
        name="i-lucide-users"
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

    <!-- Members and Invitations -->
    <template v-else>
      <!-- Members List -->
      <UCard>
        <TeamMembers
          :show-invite-button="canInviteMembers"
          @invite="handleInvite"
        />
      </UCard>

      <!-- Pending Invitations -->
      <UCard>
        <TeamInvitations />
      </UCard>

      <!-- Invite Modal -->
      <UModal v-model:open="showInviteModal">
        <template #header>
          <h3 class="text-lg font-semibold">Invite Team Member</h3>
        </template>

        <div class="p-4">
          <TeamMemberInviteForm
            @cancel="showInviteModal = false"
            @invited="handleInvited"
          />
        </div>
      </UModal>
    </template>
  </div>
</template>
