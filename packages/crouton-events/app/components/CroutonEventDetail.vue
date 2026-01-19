<script setup lang="ts">
interface EventChange {
  fieldName: string
  oldValue: string | null
  newValue: string | null
}

interface CroutonEvent {
  id: string
  timestamp: string | Date
  operation: 'create' | 'update' | 'delete'
  collectionName: string
  itemId: string
  userId: string
  userName: string
  changes: EventChange[]
  metadata?: Record<string, unknown>
}

const props = defineProps<{
  modelValue: boolean
  event: CroutonEvent
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Operation badge config
const operationConfig = computed(() => {
  switch (props.event.operation) {
    case 'create':
      return { color: 'success' as const, icon: 'i-lucide-plus', label: 'Created' }
    case 'update':
      return { color: 'info' as const, icon: 'i-lucide-pencil', label: 'Updated' }
    case 'delete':
      return { color: 'error' as const, icon: 'i-lucide-trash-2', label: 'Deleted' }
    default:
      return { color: 'neutral' as const, icon: 'i-lucide-circle', label: 'Unknown' }
  }
})

// Format timestamp
const formattedDateTime = computed(() => {
  const date = new Date(props.event.timestamp)
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

// Relative time
const relativeTime = computed(() => {
  const date = new Date(props.event.timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  return date.toLocaleDateString()
})

// Copy event ID
const toast = useToast()

function copyEventId() {
  navigator.clipboard.writeText(props.event.id)
  toast.add({
    title: 'Copied',
    description: 'Event ID copied to clipboard',
    color: 'success'
  })
}

function copyItemId() {
  navigator.clipboard.writeText(props.event.itemId)
  toast.add({
    title: 'Copied',
    description: 'Item ID copied to clipboard',
    color: 'success'
  })
}
</script>

<template>
  <UModal v-model:open="isOpen">
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div class="flex items-center gap-3">
            <div
              class="rounded-full p-2"
              :class="{
                'bg-green-100 dark:bg-green-900/30': event.operation === 'create',
                'bg-blue-100 dark:bg-blue-900/30': event.operation === 'update',
                'bg-red-100 dark:bg-red-900/30': event.operation === 'delete'
              }"
            >
              <UIcon
                :name="operationConfig.icon"
                class="size-5"
                :class="{
                  'text-green-600 dark:text-green-400': event.operation === 'create',
                  'text-blue-600 dark:text-blue-400': event.operation === 'update',
                  'text-red-600 dark:text-red-400': event.operation === 'delete'
                }"
              />
            </div>
            <div>
              <h3 class="text-lg font-semibold">
                {{ operationConfig.label }} {{ event.collectionName }}
              </h3>
              <p class="text-sm text-muted">
                {{ relativeTime }}
              </p>
            </div>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          >
            <UIcon
              name="i-lucide-x"
              class="size-4"
            />
          </UButton>
        </div>

        <!-- Meta information -->
        <div class="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div class="space-y-1">
            <dt class="text-muted font-medium">
              When
            </dt>
            <dd>{{ formattedDateTime }}</dd>
          </div>
          <div class="space-y-1">
            <dt class="text-muted font-medium">
              Who
            </dt>
            <dd class="flex items-center gap-2">
              <UIcon
                name="i-lucide-user"
                class="size-4 text-muted"
              />
              {{ event.userName || 'Unknown User' }}
            </dd>
          </div>
          <div class="space-y-1">
            <dt class="text-muted font-medium">
              Item ID
            </dt>
            <dd class="flex items-center gap-2">
              <code class="text-xs bg-muted/30 px-1.5 py-0.5 rounded font-mono">
                {{ event.itemId }}
              </code>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                @click="copyItemId"
              >
                <UIcon
                  name="i-lucide-copy"
                  class="size-3"
                />
              </UButton>
            </dd>
          </div>
          <div class="space-y-1">
            <dt class="text-muted font-medium">
              Event ID
            </dt>
            <dd class="flex items-center gap-2">
              <code class="text-xs bg-muted/30 px-1.5 py-0.5 rounded font-mono truncate max-w-[150px]">
                {{ event.id }}
              </code>
              <UButton
                color="neutral"
                variant="ghost"
                size="xs"
                @click="copyEventId"
              >
                <UIcon
                  name="i-lucide-copy"
                  class="size-3"
                />
              </UButton>
            </dd>
          </div>
        </div>

        <!-- Separator -->
        <USeparator class="my-6" />

        <!-- Changes section -->
        <div>
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon
              name="i-lucide-git-compare"
              class="size-4 text-muted"
            />
            Changes
            <UBadge
              color="neutral"
              size="xs"
            >
              {{ event.changes?.length || 0 }} field{{ event.changes?.length !== 1 ? 's' : '' }}
            </UBadge>
          </h4>

          <CroutonEventChangesTable
            :changes="event.changes"
            :operation="event.operation"
          />
        </div>

        <!-- Metadata section (if present) -->
        <div
          v-if="event.metadata && Object.keys(event.metadata).length"
          class="mt-6"
        >
          <h4 class="font-medium mb-3 flex items-center gap-2">
            <UIcon
              name="i-lucide-info"
              class="size-4 text-muted"
            />
            Metadata
          </h4>
          <pre class="text-xs bg-muted/30 rounded-lg p-3 overflow-x-auto">{{ JSON.stringify(event.metadata, null, 2) }}</pre>
        </div>

        <!-- Footer -->
        <div class="flex justify-end mt-6">
          <UButton
            color="neutral"
            variant="outline"
            @click="close"
          >
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
