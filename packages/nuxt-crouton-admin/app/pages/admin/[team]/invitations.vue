<script setup lang="ts">
/**
 * Team Invitations Management Page
 *
 * View and manage pending team invitations.
 *
 * @route /admin/[team]/invitations
 */
definePageMeta({
  middleware: ['auth', 'team-admin'],
  layout: 'admin'
})

const route = useRoute()
const { t } = useT()
const { currentTeam, canInviteMembers } = useTeam()

const teamSlug = computed(() => route.params.team as string)

// Show invite modal
const showInviteModal = ref(false)

// Handle invite button click
function handleInvite() {
  showInviteModal.value = true
}

// Handle successful invite
function handleInvited() {
  showInviteModal.value = false
  // Invitations list will auto-refresh from the component
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('teams.invitations')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            v-if="canInviteMembers"
            icon="i-lucide-user-plus"
            @click="handleInvite"
          >
            {{ t('teams.invite') }}
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto space-y-8 p-6">

    <!-- Team Info -->
    <UCard v-if="currentTeam">
      <div class="flex items-center gap-3">
        <UAvatar
          v-if="currentTeam.logo"
          :src="currentTeam.logo"
          :alt="currentTeam.name"
          size="md"
        />
        <div
          v-else
          class="flex items-center justify-center size-10 rounded-full bg-muted"
        >
          <UIcon
            name="i-lucide-building-2"
            class="size-5 text-muted-foreground"
          />
        </div>
        <div>
          <p class="font-medium">
            {{ currentTeam.name }}
          </p>
          <p class="text-sm text-muted">
            /{{ currentTeam.slug }}
          </p>
        </div>
      </div>
    </UCard>

    <!-- Pending Invitations -->
    <UCard>
      <TeamInvitations :show-team-invitations="true" />
    </UCard>

    <!-- Invite Modal -->
    <UModal v-model:open="showInviteModal">
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ t('teams.inviteMember') }}
        </h3>
      </template>

      <div class="p-4">
        <TeamMemberInviteForm
          @cancel="showInviteModal = false"
          @success="handleInvited"
        />
      </div>
    </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
