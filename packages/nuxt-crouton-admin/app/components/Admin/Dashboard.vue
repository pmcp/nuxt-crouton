<script setup lang="ts">
/**
 * Dashboard Component
 *
 * Admin dashboard with stats cards, recent activity, and quick actions.
 * Uses useAdminStats() composable for data.
 */
import { computed, onMounted } from 'vue'
import type { AdminStats } from '../../../types/admin'

interface Props {
  /** Pre-loaded stats (optional, will fetch if not provided) */
  stats?: AdminStats | null
  /** Whether to show quick actions section */
  showQuickActions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showQuickActions: true,
})

const emit = defineEmits<{
  'navigate': [path: string]
}>()

const { stats: fetchedStats, loading, error, getStats } = useAdminStats()

// Use provided stats or fetch them
const displayStats = computed(() => props.stats ?? fetchedStats.value)

// Fetch stats on mount if not provided
onMounted(async () => {
  if (!props.stats) {
    await getStats()
  }
})

const statCards = computed(() => {
  if (!displayStats.value) return []

  return [
    {
      label: 'Total Users',
      value: displayStats.value.totalUsers,
      icon: 'i-heroicons-users',
      trend: displayStats.value.newUsersToday,
      color: 'primary' as const,
    },
    {
      label: 'New This Week',
      value: displayStats.value.newUsersWeek,
      icon: 'i-heroicons-user-plus',
      color: 'success' as const,
    },
    {
      label: 'Banned Users',
      value: displayStats.value.bannedUsers,
      icon: 'i-heroicons-no-symbol',
      color: displayStats.value.bannedUsers > 0 ? 'warning' as const : 'primary' as const,
    },
    {
      label: 'Total Teams',
      value: displayStats.value.totalTeams,
      icon: 'i-heroicons-building-office-2',
      trend: displayStats.value.newTeamsWeek,
      color: 'primary' as const,
    },
    {
      label: 'Active Sessions',
      value: displayStats.value.activeSessions,
      icon: 'i-heroicons-signal',
      color: 'success' as const,
    },
    {
      label: 'Super Admins',
      value: displayStats.value.superAdminCount,
      icon: 'i-heroicons-shield-check',
      color: 'primary' as const,
    },
  ]
})

const quickActions = [
  {
    label: 'Manage Users',
    description: 'View, create, and manage user accounts',
    icon: 'i-heroicons-users',
    path: '/admin/users',
  },
  {
    label: 'View Teams',
    description: 'Browse all teams and their members',
    icon: 'i-heroicons-building-office-2',
    path: '/admin/teams',
  },
]

function handleQuickAction(path: string) {
  emit('navigate', path)
  navigateTo(path)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-heroicons-exclamation-triangle"
      title="Failed to load stats"
      :description="error"
    />

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <AdminStatsCard
        v-for="(stat, index) in statCards"
        :key="index"
        :value="stat.value"
        :label="stat.label"
        :icon="stat.icon"
        :trend="stat.trend"
        :color="stat.color"
        :loading="loading"
      />
    </div>

    <!-- Quick Actions -->
    <div v-if="showQuickActions" class="pt-4">
      <h3 class="mb-4 text-lg font-medium text-gray-900 dark:text-white">
        Quick Actions
      </h3>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
          v-for="action in quickActions"
          :key="action.path"
          type="button"
          class="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-primary-500 hover:bg-primary-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-400 dark:hover:bg-primary-950"
          @click="handleQuickAction(action.path)"
        >
          <div class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 group-hover:bg-primary-100 group-hover:text-primary-600 dark:bg-gray-800 dark:text-gray-400 dark:group-hover:bg-primary-900 dark:group-hover:text-primary-400">
            <UIcon :name="action.icon" class="size-5" />
          </div>
          <div>
            <p class="font-medium text-gray-900 dark:text-white">
              {{ action.label }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ action.description }}
            </p>
          </div>
          <UIcon
            name="i-heroicons-chevron-right"
            class="ml-auto size-5 text-gray-400 group-hover:text-primary-500"
          />
        </button>
      </div>
    </div>
  </div>
</template>
