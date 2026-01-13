<script setup lang="ts">
/**
 * Team Members Management Page
 *
 * Manage team members - view, invite, change roles, and remove members.
 *
 * @route /admin/[team]/members
 */
definePageMeta({
  middleware: ['auth', 'team-admin'],
  layout: 'dashboard'
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
  // Members list will auto-refresh from the component
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-8">
    <!-- Header with back link -->
    <div>
      <NuxtLink
        :to="`/admin/${teamSlug}`"
        class="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4"
      >
        <UIcon
          name="i-lucide-arrow-left"
          class="size-4"
        />
        {{ t('navigation.backToAdmin') }}
      </NuxtLink>

      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('teams.teamMembers') }}
          </h1>
          <p class="text-muted mt-1">
            {{ t('teams.manageMembersDescription') }}
          </p>
        </div>
        <UButton
          v-if="canInviteMembers"
          icon="i-lucide-user-plus"
          @click="handleInvite"
        >
          {{ t('teams.invite') }}
        </UButton>
      </div>
    </div>

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

    <!-- Members List -->
    <UCard>
      <TeamMembers
        :show-invite-button="false"
        @invite="handleInvite"
      />
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
