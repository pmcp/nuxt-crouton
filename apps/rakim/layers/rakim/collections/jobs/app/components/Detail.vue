<template>
  <CroutonDetailLayout
    :item="item"
    :pending="pending"
    :error="error?.message"
    :title="item?.id || 'Job Details'"
    :subtitle="item ? getJobSubtitle(item) : ''"
    :can-edit="false"
    @edit="switchToEditMode"
  >
    <template #header-actions>
      <UButton
        v-if="item?.status === 'failed'"
        icon="i-lucide-refresh-cw"
        color="primary"
        variant="soft"
        :loading="retrying"
        @click="handleRetry"
      >
        Retry
      </UButton>
      <UButton
        icon="i-lucide-external-link"
        color="neutral"
        variant="ghost"
        @click="viewDiscussion"
      >
        View Discussion
      </UButton>
    </template>

    <template #content="{ item: job }">
      <div class="space-y-6">
        <!-- Status Section -->
        <div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Job Status
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <UBadge
                :color="getStatusColor(job.status)"
                variant="subtle"
                size="md"
              >
                {{ job.status }}
              </UBadge>
            </div>
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Stage</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ job.stage || 'N/A' }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Attempts</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ job.attempts }} / {{ job.maxAttempts }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Processing Time</div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ formatDuration(job.processingTime) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Timestamps Section -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Timestamps
          </h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-600 dark:text-gray-400">Started At:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ job.startedAt ? formatDate(job.startedAt) : 'Not started' }}
              </span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-600 dark:text-gray-400">Completed At:</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ job.completedAt ? formatDate(job.completedAt) : 'Not completed' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Related Resources Section -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Related Resources
          </h3>
          <div class="space-y-3">
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Discussion</div>
              <CroutonItemCardMini
                :id="job.discussionId"
                collection="discubotDiscussions"
              />
            </div>
            <div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Config</div>
              <CroutonItemCardMini
                :id="job.sourceConfigId"
                collection="discubotConfigs"
              />
            </div>
          </div>
        </div>

        <!-- Tasks Created (if any) -->
        <div v-if="job.taskIds && job.taskIds.length > 0">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Tasks Created ({{ job.taskIds.length }})
          </h3>
          <div class="space-y-2">
            <div
              v-for="taskId in job.taskIds"
              :key="taskId"
            >
              <CroutonItemCardMini
                :id="taskId"
                collection="discubotTasks"
              />
            </div>
          </div>
        </div>

        <!-- Error Section (if failed) -->
        <div v-if="job.status === 'failed' && job.error" class="bg-error-50 dark:bg-error-900/20 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-error-900 dark:text-error-100 mb-3 flex items-center gap-2">
            <UIcon name="i-lucide-octagon-alert" class="w-4 h-4" />
            Error Details
          </h3>
          <div class="space-y-3">
            <div>
              <div class="text-xs text-error-700 dark:text-error-300 mb-1">Error Message</div>
              <div class="text-sm text-error-900 dark:text-error-100 font-mono bg-white dark:bg-gray-950 p-2 rounded">
                {{ job.error }}
              </div>
            </div>
            <div v-if="job.errorStack">
              <button
                class="text-xs text-error-700 dark:text-error-300 hover:text-error-900 dark:hover:text-error-100 flex items-center gap-1"
                @click="showStackTrace = !showStackTrace"
              >
                <UIcon :name="showStackTrace ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-3 h-3" />
                {{ showStackTrace ? 'Hide' : 'Show' }} Stack Trace
              </button>
              <div v-if="showStackTrace" class="mt-2 text-xs text-error-900 dark:text-error-100 font-mono bg-white dark:bg-gray-950 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                <pre>{{ job.errorStack }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Metadata Section -->
        <div v-if="job.metadata && Object.keys(job.metadata).length > 0">
          <button
            class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2 hover:text-gray-900 dark:hover:text-white"
            @click="showMetadata = !showMetadata"
          >
            <UIcon :name="showMetadata ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="w-4 h-4" />
            Stage Metadata
          </button>
          <div v-if="showMetadata" class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <pre class="text-xs font-mono text-gray-900 dark:text-white overflow-x-auto">{{ JSON.stringify(job.metadata, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </template>

    <template #footer="{ item: job }">
      <div class="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
        <div>
          Created: <CroutonDate :date="job.createdAt" format="relative" />
        </div>
        <div>
          Updated: <CroutonDate :date="job.updatedAt" format="relative" />
        </div>
      </div>
    </template>
  </CroutonDetailLayout>
</template>

<script setup lang="ts">
interface Props {
  activeItem: any
  collection: string
  action: string
}

const props = defineProps<Props>()

const { open, close } = useCrouton()
const toast = useToast()

// Fetch job details using useCollectionItem
const { item, pending, error, refresh } = await useCollectionItem(
  props.collection,
  () => props.activeItem?.id
)

// UI state
const showStackTrace = ref(false)
const showMetadata = ref(false)
const retrying = ref(false)

// Helper functions
const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'processing':
      return 'primary'
    case 'failed':
      return 'error'
    case 'pending':
      return 'neutral'
    default:
      return 'neutral'
  }
}

const getJobSubtitle = (job: any) => {
  const parts = []
  if (job.status) parts.push(job.status)
  if (job.stage) parts.push(job.stage)
  return parts.join(' • ')
}

const formatDate = (date: string | Date) => {
  if (!date) return 'N/A'
  return new Date(date).toLocaleString()
}

const formatDuration = (ms: number) => {
  if (!ms) return 'N/A'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

// Actions
const switchToEditMode = () => {
  close()
  open('update', props.collection, [item.value.id])
}

const viewDiscussion = () => {
  if (item.value?.discussionId) {
    close()
    open('view', 'discubotDiscussions', [item.value.discussionId])
  }
}

const handleRetry = async () => {
  if (!item.value?.discussionId) {
    toast.add({
      title: 'Error',
      description: 'Cannot retry: Discussion ID not found',
      color: 'error'
    })
    return
  }

  try {
    retrying.value = true

    await $fetch('/api/discussions/process', {
      method: 'POST',
      body: {
        type: 'retry',
        discussionId: item.value.discussionId
      }
    })

    toast.add({
      title: 'Success',
      description: 'Job retry initiated',
      color: 'success'
    })

    // Refresh the job details
    await refresh()
  } catch (err: any) {
    console.error('Retry failed:', err)
    toast.add({
      title: 'Retry Failed',
      description: err?.message || 'Failed to retry job',
      color: 'error'
    })
  } finally {
    retrying.value = false
  }
}
</script>
