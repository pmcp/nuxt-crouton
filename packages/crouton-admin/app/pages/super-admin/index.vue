<script setup lang="ts">
/**
 * Super Admin Dashboard
 *
 * Overview with stats and quick navigation.
 */
definePageMeta({
  layout: 'super-admin',
  middleware: 'super-admin'
})

useSeoMeta({ title: 'Dashboard - Super Admin' })

const { data: stats, status, error } = await useFetch('/api/admin/stats')
</script>

<template>
  <div class="p-6">
    <div class="mb-6">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <p class="text-sm text-muted">Platform overview</p>
    </div>

    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      title="Failed to load stats"
      :description="error.message"
      class="mb-4"
    />

    <!-- Stats Grid -->
    <div v-if="stats" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-users" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ stats.totalUsers }}</p>
            <p class="text-sm text-muted">Users</p>
          </div>
        </div>
        <p v-if="stats.newUsersToday > 0" class="mt-2 text-xs text-success">
          +{{ stats.newUsersToday }} today
        </p>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-building-2" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ stats.totalTeams }}</p>
            <p class="text-sm text-muted">Teams</p>
          </div>
        </div>
        <p v-if="stats.newTeamsWeek > 0" class="mt-2 text-xs text-success">
          +{{ stats.newTeamsWeek }} this week
        </p>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-activity" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ stats.activeSessions }}</p>
            <p class="text-sm text-muted">Active sessions</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-user-plus" class="size-5 text-success" />
          <div>
            <p class="text-2xl font-bold">{{ stats.newUsersWeek }}</p>
            <p class="text-sm text-muted">New users (7d)</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-ban" class="size-5" :class="stats.bannedUsers > 0 ? 'text-warning' : 'text-muted'" />
          <div>
            <p class="text-2xl font-bold">{{ stats.bannedUsers }}</p>
            <p class="text-sm text-muted">Banned users</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-shield-check" class="size-5 text-primary" />
          <div>
            <p class="text-2xl font-bold">{{ stats.superAdminCount }}</p>
            <p class="text-sm text-muted">Super admins</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <h2 class="text-lg font-semibold mb-3">Quick Actions</h2>
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UButton
        to="/super-admin/users"
        variant="outline"
        color="neutral"
        icon="i-lucide-users"
        size="lg"
        block
        class="justify-start"
      >
        Manage Users
      </UButton>
      <UButton
        to="/super-admin/teams"
        variant="outline"
        color="neutral"
        icon="i-lucide-building-2"
        size="lg"
        block
        class="justify-start"
      >
        View Teams
      </UButton>
    </div>
  </div>
</template>
