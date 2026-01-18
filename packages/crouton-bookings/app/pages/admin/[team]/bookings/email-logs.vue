<script setup lang="ts">
/**
 * Email Logs Page
 *
 * Displays a log of all booking emails sent for the team.
 * Shows status, recipient, trigger type, and timestamps.
 *
 * @route /admin/[team]/bookings/email-logs
 */
const route = useRoute()
const teamId = computed(() => route.params.team as string)

// Fetch email logs
const { data: emailLogs, status, refresh } = await useFetch(
  () => `/api/teams/${teamId.value}/bookings-emaillogs`,
  {
    key: `email-logs-${teamId.value}`,
    query: {
      limit: 100,
      orderBy: 'createdAt',
      orderDir: 'desc'
    }
  }
)

// Refresh on every navigation to this page (handles keep-alive and client navigation)
onActivated(() => {
  refresh()
})

// Also refresh when route changes (for direct navigation)
watch(() => route.fullPath, () => {
  if (route.path.endsWith('/email-logs')) {
    refresh()
  }
})

// Normalize items from API response
const logs = computed(() => {
  if (!emailLogs.value) return []
  return Array.isArray(emailLogs.value) ? emailLogs.value : emailLogs.value.items || []
})

// Status badge config
const statusConfig: Record<string, { color: 'success' | 'warning' | 'error'; icon: string }> = {
  sent: {
    color: 'success',
    icon: 'i-lucide-check-circle'
  },
  pending: {
    color: 'warning',
    icon: 'i-lucide-clock'
  },
  failed: {
    color: 'error',
    icon: 'i-lucide-x-circle'
  }
}

// Trigger type labels
const triggerLabels: Record<string, string> = {
  booking_created: 'Confirmation',
  reminder_before: 'Reminder',
  booking_cancelled: 'Cancellation',
  follow_up_after: 'Follow Up'
}

// Format date
function formatDate(dateString: string | null) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

// Statistics
const stats = computed(() => {
  const sent = logs.value.filter((l: any) => l.status === 'sent').length
  const pending = logs.value.filter((l: any) => l.status === 'pending').length
  const failed = logs.value.filter((l: any) => l.status === 'failed').length
  return { sent, pending, failed, total: logs.value.length }
})

// Error modal state
const showErrorModal = ref(false)
const selectedError = ref<string | null>(null)

function viewError(error: string) {
  selectedError.value = error
  showErrorModal.value = true
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Email Logs</h1>
        <p class="text-muted mt-1">Track sent booking notification emails</p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        :loading="status === 'pending'"
        @click="refresh()"
      >
        Refresh
      </UButton>
    </div>

    <!-- Stats Cards -->
    <div class="grid gap-4 sm:grid-cols-4">
      <UCard class="text-center">
        <div class="text-3xl font-bold">{{ stats.total }}</div>
        <div class="text-sm text-muted mt-1">Total Emails</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-3xl font-bold text-success">{{ stats.sent }}</div>
        <div class="text-sm text-muted mt-1">Sent</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-3xl font-bold text-warning">{{ stats.pending }}</div>
        <div class="text-sm text-muted mt-1">Pending</div>
      </UCard>
      <UCard class="text-center">
        <div class="text-3xl font-bold text-error">{{ stats.failed }}</div>
        <div class="text-sm text-muted mt-1">Failed</div>
      </UCard>
    </div>

    <!-- Loading state -->
    <div v-if="status === 'pending'" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <!-- Empty state -->
    <div v-else-if="logs.length === 0" class="text-center py-12 border border-dashed border-default rounded-lg">
      <UIcon name="i-lucide-mail" class="size-12 text-muted mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-1">No Email Logs Yet</h3>
      <p class="text-muted">Email logs will appear here once booking emails are sent.</p>
    </div>

    <!-- Logs Table -->
    <UCard v-else>
      <UTable
        :data="logs"
        :columns="[
          { accessorKey: 'status', header: 'Status' },
          { accessorKey: 'recipientEmail', header: 'Recipient' },
          { accessorKey: 'triggerType', header: 'Type' },
          { accessorKey: 'sentAt', header: 'Sent At' },
          { accessorKey: 'createdAt', header: 'Created' },
          { accessorKey: 'error', header: 'Error' }
        ]"
      >
        <template #status-cell="{ row }">
          <UBadge
            :color="statusConfig[row.original.status]?.color || 'neutral'"
            variant="subtle"
            size="sm"
            class="inline-flex items-center gap-1"
          >
            <UIcon
              :name="statusConfig[row.original.status]?.icon || 'i-lucide-circle'"
              class="size-3"
            />
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #recipientEmail-cell="{ row }">
          <span class="font-mono text-xs">{{ row.original.recipientEmail }}</span>
        </template>
        <template #triggerType-cell="{ row }">
          <span class="text-muted">{{ triggerLabels[row.original.triggerType] || row.original.triggerType }}</span>
        </template>
        <template #sentAt-cell="{ row }">
          <span class="text-muted">{{ formatDate(row.original.sentAt) }}</span>
        </template>
        <template #createdAt-cell="{ row }">
          <span class="text-muted">{{ formatDate(row.original.createdAt) }}</span>
        </template>
        <template #error-cell="{ row }">
          <UButton
            v-if="row.original.error"
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-alert-circle"
            @click="viewError(row.original.error)"
          >
            View
          </UButton>
          <span v-else class="text-muted">-</span>
        </template>
      </UTable>
    </UCard>
  </div>

  <!-- Error Details Modal -->
  <UModal v-model:open="showErrorModal">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
          <UIcon name="i-lucide-alert-circle" class="size-5 text-error" />
          Error Details
        </h3>
        <pre class="bg-error/10 text-error p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap">{{ selectedError }}</pre>
        <div class="flex justify-end mt-4">
          <UButton color="neutral" variant="ghost" @click="showErrorModal = false">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>