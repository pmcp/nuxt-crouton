<script setup lang="ts">
/**
 * NotionSettings.vue
 *
 * Settings form for Notion integration (two-way task sync).
 * Allows team admins to configure:
 * - Integration Token (stored server-side, only hint shown)
 * - Task Database ID
 * - Status mapping (idle/working/done → Notion status names)
 */

const { teamSlug } = useTeamContext()
const notify = useNotify()

const loading = ref(false)
const saving = ref(false)

// Form state
const integrationToken = ref('')
const integrationTokenHint = ref<string | null>(null)
const taskDatabaseId = ref('')
const statusIdle = ref('To Do')
const statusWorking = ref('In Progress')
const statusDone = ref('Done')

// Load existing settings
async function loadSettings() {
  loading.value = true
  try {
    const data = await $fetch<{
      taskDatabaseId: string | null
      integrationTokenHint: string | null
      statusMapping: { idle?: string, working?: string, done?: string } | null
    }>(`/api/teams/${teamSlug.value}/settings/notion`)

    taskDatabaseId.value = data.taskDatabaseId ?? ''
    integrationTokenHint.value = data.integrationTokenHint
    if (data.statusMapping) {
      statusIdle.value = data.statusMapping.idle ?? 'To Do'
      statusWorking.value = data.statusMapping.working ?? 'In Progress'
      statusDone.value = data.statusMapping.done ?? 'Done'
    }
  } catch {
    // Settings not configured yet — keep defaults
  } finally {
    loading.value = false
  }
}

// Save settings
async function save() {
  saving.value = true
  try {
    const payload: Record<string, unknown> = {
      taskDatabaseId: taskDatabaseId.value || undefined,
      statusMapping: {
        idle: statusIdle.value || undefined,
        working: statusWorking.value || undefined,
        done: statusDone.value || undefined
      }
    }

    // Only send token if user typed a new one
    if (integrationToken.value) {
      payload.integrationToken = integrationToken.value
    }

    const data = await $fetch<{
      taskDatabaseId: string | null
      integrationTokenHint: string | null
      statusMapping: { idle?: string, working?: string, done?: string } | null
    }>(`/api/teams/${teamSlug.value}/settings/notion`, {
      method: 'PATCH',
      body: payload
    })

    // Update hint from response
    integrationTokenHint.value = data.integrationTokenHint
    // Clear the token input after successful save
    integrationToken.value = ''

    notify.success('Notion settings saved')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save Notion settings'
    notify.error('Error', { description: message })
  } finally {
    saving.value = false
  }
}

onMounted(loadSettings)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-semibold">Notion Integration</h3>
      <p class="text-sm text-muted mt-1">
        Connect to Notion to automatically create and update task pages when node statuses change.
      </p>
    </div>

    <div v-if="loading" class="flex items-center gap-2 py-8 justify-center text-muted">
      <UIcon name="i-lucide-loader-2" class="size-5 animate-spin" />
      <span>Loading settings...</span>
    </div>

    <template v-else>
      <!-- Integration Token -->
      <UFormField label="Integration Token" name="integrationToken">
        <template #hint>
          <span v-if="integrationTokenHint" class="text-xs text-muted">
            Current: {{ integrationTokenHint }}
          </span>
        </template>
        <UInput
          v-model="integrationToken"
          type="password"
          :placeholder="integrationTokenHint ? 'Enter new token to replace' : 'secret_...'"
          autocomplete="off"
          class="w-full"
        />
        <template #description>
          <span class="text-xs text-muted">
            Create an <a href="https://www.notion.so/my-integrations" target="_blank" class="text-primary underline">internal integration</a> and paste the token here.
          </span>
        </template>
      </UFormField>

      <!-- Task Database ID -->
      <UFormField label="Task Database ID" name="taskDatabaseId">
        <UInput
          v-model="taskDatabaseId"
          placeholder="e.g. abc123def456..."
          class="w-full"
        />
        <template #description>
          <span class="text-xs text-muted">
            The ID of the Notion database where task pages will be created. Must have a "Name" (title) and "Status" property.
          </span>
        </template>
      </UFormField>

      <!-- Status Mapping -->
      <div class="space-y-3">
        <p class="text-sm font-medium">Status Mapping</p>
        <p class="text-xs text-muted">
          Map ThinkGraph node statuses to your Notion database's Status property values.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <UFormField label="Idle (approved)" name="statusIdle">
            <UInput
              v-model="statusIdle"
              placeholder="To Do"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Working" name="statusWorking">
            <UInput
              v-model="statusWorking"
              placeholder="In Progress"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Done" name="statusDone">
            <UInput
              v-model="statusDone"
              placeholder="Done"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>

      <!-- Save Button -->
      <div class="flex justify-end pt-2">
        <UButton
          label="Save Notion Settings"
          icon="i-lucide-save"
          :loading="saving"
          @click="save"
        />
      </div>
    </template>
  </div>
</template>
