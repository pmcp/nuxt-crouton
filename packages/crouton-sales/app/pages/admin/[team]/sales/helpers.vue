<script setup lang="ts">
/**
 * Active Helpers — team-wide view of all currently logged-in helpers
 *
 * Data comes from scopedAccessToken (crouton-auth), not a sales collection.
 * Each row is an active scoped-access session with `role='helper'`.
 *
 * @route /admin/[team]/sales/helpers
 */
definePageMeta({ middleware: ['auth'] })

const route = useRoute()
const teamParam = computed(() => route.params.team as string)

interface ActiveHelper {
  id: string
  displayName: string
  role: string
  resourceId: string
  eventTitle: string | null
  expiresAt: string
  lastActiveAt: string | null
}

const { data: helpers, pending, refresh } = await useFetch<ActiveHelper[]>(
  () => `/api/crouton-sales/teams/${teamParam.value}/active-helpers`,
  { default: () => [] }
)

const columns = [
  { accessorKey: 'displayName', header: 'Helper' },
  { accessorKey: 'eventTitle', header: 'Event' },
  { accessorKey: 'lastActiveAt', header: 'Last active' },
  { accessorKey: 'expiresAt', header: 'Expires' }
]
</script>

<template>
  <div class="space-y-4 p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold">Active Helpers</h2>
        <p class="text-sm text-muted">Helpers currently logged in across all events for this team.</p>
      </div>
      <UButton
        variant="outline"
        size="sm"
        icon="i-lucide-refresh-cw"
        :loading="pending"
        @click="() => refresh()"
      >
        Refresh
      </UButton>
    </div>

    <UTable
      :data="helpers || []"
      :columns="columns"
      :loading="pending"
    >
      <template #lastActiveAt-cell="{ row }">
        <span class="text-sm text-muted">
          {{ row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleString() : '—' }}
        </span>
      </template>
      <template #expiresAt-cell="{ row }">
        <span class="text-sm text-muted">
          {{ new Date(row.original.expiresAt).toLocaleString() }}
        </span>
      </template>
      <template #empty>
        <div class="p-12 text-center text-muted">
          <UIcon name="i-lucide-users" class="text-4xl mb-2" />
          <p>No helpers currently logged in.</p>
        </div>
      </template>
    </UTable>
  </div>
</template>
