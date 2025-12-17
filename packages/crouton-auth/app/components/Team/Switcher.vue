<script setup lang="ts">
/**
 * Team Switcher Component
 *
 * Dropdown menu to switch between teams (organizations).
 * Only shown in multi-tenant mode when user has multiple teams.
 *
 * @example
 * ```vue
 * <TeamSwitcher />
 * ```
 */
import type { Team } from '../../../types'

interface Props {
  /** Show create team option */
  showCreate?: boolean
  /** Custom label instead of team name */
  label?: string
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  showCreate: true,
  size: 'md',
})

const emit = defineEmits<{
  /** Emitted when team is switched */
  switch: [team: Team]
  /** Emitted when create team is clicked */
  create: []
}>()

const {
  currentTeam,
  teams,
  switchTeam,
  showTeamSwitcher,
  canCreateTeam,
  loading,
} = useTeam()

const { buildDashboardUrl } = useTeamContext()

// Handle team switch
async function handleSwitch(team: Team) {
  if (team.id === currentTeam.value?.id) return

  await switchTeam(team.id)
  emit('switch', team)

  // Navigate to new team's dashboard
  const dashboardUrl = buildDashboardUrl(team.slug, '')
  await navigateTo(dashboardUrl)
}

// Handle create team click
function handleCreate() {
  emit('create')
}

// Build items for dropdown menu
const menuItems = computed(() => {
  const items: Array<{ label: string, icon: string, click?: () => void, slot?: string }[]> = []

  // Team list
  const teamItems = teams.value.map((team) => ({
    label: team.name,
    icon: team.id === currentTeam.value?.id ? 'i-lucide-check' : 'i-lucide-building-2',
    click: () => handleSwitch(team),
  }))

  if (teamItems.length > 0) {
    items.push(teamItems)
  }

  // Create team option
  if (props.showCreate && canCreateTeam.value) {
    items.push([
      {
        label: 'Create team',
        icon: 'i-lucide-plus',
        click: handleCreate,
      },
    ])
  }

  return items
})
</script>

<template>
  <UDropdownMenu
    v-if="showTeamSwitcher"
    :items="menuItems"
  >
    <UButton
      :size="size"
      variant="ghost"
      :loading="loading"
      trailing-icon="i-lucide-chevron-down"
    >
      <template #leading>
        <UAvatar
          v-if="currentTeam?.logo"
          :src="currentTeam.logo"
          :alt="currentTeam.name"
          size="2xs"
        />
        <UIcon
          v-else
          name="i-lucide-building-2"
          class="size-4"
        />
      </template>
      {{ label || currentTeam?.name || 'Select team' }}
    </UButton>
  </UDropdownMenu>

  <!-- Non-multi-tenant: just show current team name -->
  <div
    v-else-if="currentTeam"
    class="flex items-center gap-2 text-sm"
  >
    <UAvatar
      v-if="currentTeam.logo"
      :src="currentTeam.logo"
      :alt="currentTeam.name"
      size="2xs"
    />
    <UIcon
      v-else
      name="i-lucide-building-2"
      class="size-4 text-muted"
    />
    <span class="font-medium">{{ currentTeam.name }}</span>
  </div>
</template>
