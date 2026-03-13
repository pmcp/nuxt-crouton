<script setup lang="ts">
/**
 * Admin Email Logs Component
 *
 * Shows auth email log history with stats, filtering, and error details.
 * Scoped to the current team's member emails.
 *
 * @example
 * ```vue
 * <AdminEmailLogs />
 * ```
 */
const { t } = useT()
const { teamSlug } = useTeamContext()

// Filters
const selectedType = ref<string>('')
const selectedStatus = ref<string>('')

// Error detail modal
const showErrorModal = ref(false)
const selectedError = ref('')

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {}
  if (selectedType.value) params.type = selectedType.value
  if (selectedStatus.value) params.status = selectedStatus.value
  return params
})

// Fetch stats
const { data: stats, refresh: refreshStats } = useFetch(
  () => `/api/teams/${teamSlug.value}/email-logs/stats`,
  { key: `auth-email-stats-${teamSlug.value}` }
)

// Fetch logs
const { data: logsData, pending, refresh: refreshLogs } = useFetch(
  () => `/api/teams/${teamSlug.value}/email-logs`,
  {
    key: `auth-email-logs-${teamSlug.value}`,
    query: queryParams
  }
)

const logs = computed(() => {
  if (!logsData.value) return []
  return Array.isArray(logsData.value) ? logsData.value : (logsData.value as any).items || []
})

// Refresh on filter change
watch([selectedType, selectedStatus], () => {
  refreshLogs()
})

function refresh() {
  refreshStats()
  refreshLogs()
}

// Status config
const statusConfig: Record<string, { color: string, icon: string, label: string }> = {
  sent: { color: 'success', icon: 'i-lucide-check-circle', label: 'emailLogs.statusSent' },
  pending: { color: 'warning', icon: 'i-lucide-clock', label: 'emailLogs.statusPending' },
  failed: { color: 'error', icon: 'i-lucide-x-circle', label: 'emailLogs.statusFailed' }
}

// Email type config
const typeConfig: Record<string, { icon: string, label: string }> = {
  'verification': { icon: 'i-lucide-mail-check', label: 'emailLogs.typeVerification' },
  'password-reset': { icon: 'i-lucide-key-round', label: 'emailLogs.typePasswordReset' },
  'invitation': { icon: 'i-lucide-user-plus', label: 'emailLogs.typeInvitation' },
  'magic-link': { icon: 'i-lucide-wand-2', label: 'emailLogs.typeMagicLink' }
}

const typeOptions = [
  { label: t('emailLogs.allTypes'), value: '' },
  { label: t('emailLogs.typeVerification'), value: 'verification' },
  { label: t('emailLogs.typePasswordReset'), value: 'password-reset' },
  { label: t('emailLogs.typeInvitation'), value: 'invitation' },
  { label: t('emailLogs.typeMagicLink'), value: 'magic-link' }
]

const statusOptions = [
  { label: t('emailLogs.allStatuses'), value: '' },
  { label: t('emailLogs.statusSent'), value: 'sent' },
  { label: t('emailLogs.statusPending'), value: 'pending' },
  { label: t('emailLogs.statusFailed'), value: 'failed' }
]

// Table columns
const columns = [
  { accessorKey: 'emailType', header: t('emailLogs.type') },
  { accessorKey: 'recipientEmail', header: t('emailLogs.recipient') },
  { accessorKey: 'status', header: t('emailLogs.status') },
  { accessorKey: 'sentAt', header: t('emailLogs.sentAt') },
  { accessorKey: 'createdAt', header: t('emailLogs.createdAt') }
]

function formatDate(date: string | Date | null) {
  if (!date) return '—'
  return new Date(date).toLocaleString()
}

function showError(error: string) {
  selectedError.value = error
  showErrorModal.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">
          {{ t('emailLogs.title') }}
        </h3>
        <p class="text-sm text-muted mt-1">
          {{ t('emailLogs.description') }}
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        :loading="pending"
        @click="refresh"
      />
    </div>

    <!-- Stats Cards -->
    <div
      v-if="stats"
      class="grid grid-cols-2 gap-4 sm:grid-cols-4"
    >
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold">
            {{ stats.total }}
          </p>
          <p class="text-sm text-muted">
            {{ t('emailLogs.totalEmails') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-success">
            {{ stats.sent }}
          </p>
          <p class="text-sm text-muted">
            {{ t('emailLogs.statusSent') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-warning">
            {{ stats.pending }}
          </p>
          <p class="text-sm text-muted">
            {{ t('emailLogs.statusPending') }}
          </p>
        </div>
      </UCard>
      <UCard>
        <div class="text-center">
          <p class="text-2xl font-bold text-error">
            {{ stats.failed }}
          </p>
          <p class="text-sm text-muted">
            {{ t('emailLogs.statusFailed') }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelectMenu
        v-model="selectedType"
        :items="typeOptions"
        value-key="value"
        class="w-48"
      />
      <USelectMenu
        v-model="selectedStatus"
        :items="statusOptions"
        value-key="value"
        class="w-48"
      />
    </div>

    <!-- Logs Table -->
    <UTable
      :data="logs"
      :columns="columns"
      :loading="pending"
    >
      <template #emailType-cell="{ row }">
        <div class="flex items-center gap-2">
          <UIcon
            :name="typeConfig[row.original.emailType]?.icon || 'i-lucide-mail'"
            class="size-4 text-muted-foreground"
          />
          <span>{{ t(typeConfig[row.original.emailType]?.label || 'emailLogs.typeUnknown') }}</span>
        </div>
      </template>

      <template #recipientEmail-cell="{ row }">
        <span class="font-mono text-sm">{{ row.original.recipientEmail }}</span>
      </template>

      <template #status-cell="{ row }">
        <div class="flex items-center gap-2">
          <UBadge
            :color="(statusConfig[row.original.status]?.color as any) || 'neutral'"
            variant="subtle"
          >
            <UIcon
              :name="statusConfig[row.original.status]?.icon || 'i-lucide-circle'"
              class="size-3 mr-1"
            />
            {{ t(statusConfig[row.original.status]?.label || 'emailLogs.statusUnknown') }}
          </UBadge>
          <UButton
            v-if="row.original.error"
            icon="i-lucide-alert-triangle"
            variant="ghost"
            color="error"
            size="xs"
            @click="showError(row.original.error)"
          />
        </div>
      </template>

      <template #sentAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.sentAt) }}</span>
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>
    </UTable>

    <!-- Empty State -->
    <div
      v-if="!pending && logs.length === 0"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-mail-x"
        class="size-12 text-muted-foreground mx-auto mb-3"
      />
      <p class="text-muted">
        {{ t('emailLogs.noLogs') }}
      </p>
    </div>

    <!-- Error Detail Modal -->
    <UModal v-model:open="showErrorModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">
            {{ t('emailLogs.errorDetails') }}
          </h3>
          <pre class="bg-muted/40 rounded-lg p-4 text-sm overflow-auto max-h-64 whitespace-pre-wrap">{{ selectedError }}</pre>
          <div class="flex justify-end mt-4">
            <UButton
              variant="ghost"
              @click="close"
            >
              {{ t('common.close') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
