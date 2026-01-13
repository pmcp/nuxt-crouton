<script setup lang="ts">
/**
 * Team Settings Page
 *
 * Team configuration settings including name, slug, and logo.
 * Only accessible by team admins/owners.
 *
 * @route /admin/[team]/settings
 */
definePageMeta({
  middleware: ['auth', 'team-admin'],
  layout: 'dashboard'
})

const route = useRoute()
const { t } = useT()
const { currentTeam, isOwner, deleteTeam, isAdmin } = useTeam()
const toast = useToast()

const teamSlug = computed(() => route.params.team as string)

// Show delete confirmation modal
const showDeleteModal = ref(false)

// Handle team deletion
async function handleDelete() {
  try {
    await deleteTeam()
    toast.add({
      title: t('teams.teamDeleted'),
      description: t('teams.teamDeletedDescription'),
      color: 'success'
    })
    // Redirect to dashboard root (will need to select new team)
    await navigateTo('/dashboard')
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : t('errors.generic')
    toast.add({
      title: t('common.error'),
      description: message,
      color: 'error'
    })
  }
}

// Handle saved event from TeamSettings component
function handleSaved() {
  toast.add({
    title: t('common.saved'),
    description: t('teams.settingsSaved'),
    color: 'success'
  })
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8">
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

      <h1 class="text-2xl font-bold">
        {{ t('teams.teamSettings') }}
      </h1>
      <p class="text-muted mt-1">
        {{ t('teams.teamSettingsDescription') }}
      </p>
    </div>

    <!-- Not a team admin -->
    <UCard
      v-if="!isAdmin"
      class="text-center py-8"
    >
      <UIcon
        name="i-lucide-shield-alert"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">
        {{ t('common.accessRestricted') }}
      </h3>
      <p class="text-muted mt-2 max-w-md mx-auto">
        {{ t('teams.adminAccessRequired') }}
      </p>
      <NuxtLink :to="`/admin/${teamSlug}`">
        <UButton
          :label="t('navigation.backToAdmin')"
          variant="outline"
          class="mt-4"
        />
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
        v-if="currentTeam && isOwner"
        v-model:open="showDeleteModal"
        :team-name="currentTeam.name"
        @confirm="handleDelete"
      />
    </template>
  </div>
</template>
