<script setup lang="ts">
/**
 * Team Settings Page
 *
 * Team configuration settings including name, slug, logo, and theme.
 * Only accessible by team admins/owners.
 *
 * @route /admin/[team]/team/settings
 */
const route = useRoute()
const { t } = useT()
const { currentTeam, isOwner, deleteTeam, isAdmin } = useTeam()
const toast = useToast()

const teamSlug = computed(() => route.params.team as string)

// Show delete confirmation modal
const showDeleteModal = ref(false)

// Active tab for settings sections
const activeTab = ref('general')

// Tab items for settings navigation
const tabItems = [
  {
    label: t('teams.generalSettings') || 'General',
    value: 'general',
    icon: 'i-lucide-settings'
  },
  {
    label: t('teams.themeSettings') || 'Theme',
    value: 'theme',
    icon: 'i-lucide-palette'
  }
]

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

// Handle theme saved event
function handleThemeSaved() {
  toast.add({
    title: t('common.saved') || 'Saved',
    description: t('teams.themeSettingsSaved') || 'Theme settings have been updated.',
    color: 'success'
  })
}
</script>

<template>
  <div class="p-6">
    <!-- Not a team admin -->
    <div
      v-if="!isAdmin"
      class="text-center py-8"
    >
      <UIcon
        name="i-lucide-shield-alert"
        class="size-12 mx-auto mb-4 text-muted opacity-50"
      />
      <h3 class="text-lg font-medium">{{ t('common.accessRestricted') || 'Access Restricted' }}</h3>
      <p class="text-muted mt-2 max-w-md mx-auto">{{ t('teams.adminAccessRequired') || 'Admin access required' }}</p>
      <NuxtLink :to="`/admin/${teamSlug}/team`">
        <UButton
          :label="t('navigation.backToTeam') || 'Back to Team'"
          variant="outline"
          class="mt-4"
        />
      </NuxtLink>
    </div>

    <!-- Team Settings Tabs -->
    <template v-else>
      <!-- Tab Navigation -->
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        :content="false"
        variant="link"
        class="w-full mb-6"
      />

      <!-- General Settings Tab -->
      <div v-show="activeTab === 'general'">
        <TeamSettings
          @saved="handleSaved"
          @delete="showDeleteModal = true"
        />
      </div>

      <!-- Theme Settings Tab -->
      <div v-show="activeTab === 'theme'">
        <TeamThemeSettings @saved="handleThemeSaved" />
      </div>

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
