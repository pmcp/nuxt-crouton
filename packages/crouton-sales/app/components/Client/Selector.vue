<template>
  <div class="space-y-2 p-3 -m-3 rounded-lg" :class="highlight ? 'border border-warning bg-warning/5' : ''">
    <label class="text-sm font-medium text-muted">Client</label>

    <!-- Reusable clients mode: dropdown with search and create -->
    <template v-if="useReusableClients">
      <USelectMenu
        v-model="selectedValue"
        :items="allItems"
        placeholder="Select or create client..."
        icon="i-lucide-user"
        size="lg"
        class="w-full"
        :loading="creating"
        create-item
        @create="onCreate"
      />
    </template>

    <!-- Free-text mode: simple input -->
    <template v-else>
      <UInput
        v-model="clientName"
        placeholder="Enter client name..."
        icon="i-lucide-user"
        size="lg"
        class="w-full"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SalesClient } from '../../types'

const props = defineProps<{
  clients: SalesClient[]
  useReusableClients: boolean
  highlight?: boolean
  clientId?: string | null
  clientName?: string
  /** Collection name to use for creating clients (defaults to 'salesClients') */
  collectionName?: string
}>()

const emit = defineEmits<{
  'update:clientId': [clientId: string | null]
  'update:clientName': [clientName: string]
  'client-created': [client: SalesClient]
}>()

// For free-text mode
const clientName = ref('')

// For reusable clients mode
const selectedValue = ref<string>('')
const creating = ref(false)

// Track newly created clients (with their IDs)
const createdClients = ref<SalesClient[]>([])

// Combine existing clients with any newly created items
const allItems = computed(() => {
  const existing = props.clients.map(c => c.title)
  const created = createdClients.value.map(c => c.title)
  return [...existing, ...created]
})

// All clients including created ones (for ID lookup)
const allClients = computed(() => [...props.clients, ...createdClients.value])

// Use crouton mutation to create client in database
// The collection name can be customized but defaults to 'salesClients'
const { create } = useCollectionMutation(props.collectionName || 'salesClients')

// Handle creating a new client
async function onCreate(title: string) {
  creating.value = true
  try {
    const newClient = await create({ title, isReusable: true })
    if (newClient?.id) {
      createdClients.value.push({ id: newClient.id, title })
      selectedValue.value = title
      emit('client-created', { id: newClient.id, title })
    }
  }
  catch (error) {
    console.error('Failed to create client:', error)
  }
  finally {
    creating.value = false
  }
}

// Emit changes for reusable mode
watch(selectedValue, (value) => {
  if (!value) return

  // Find the client (from existing or created)
  const client = allClients.value.find(c => c.title === value)
  if (client) {
    emit('update:clientId', client.id)
    emit('update:clientName', client.title)
  }
})

// Emit changes for free-text mode
watch(clientName, (value) => {
  emit('update:clientName', value)
  emit('update:clientId', null)
})

// Sync with external props (for clearing/resetting)
watch(() => props.clientId, (newId) => {
  if (newId === null && props.useReusableClients) {
    selectedValue.value = ''
  }
})

watch(() => props.clientName, (newName) => {
  if (!props.useReusableClients && newName !== clientName.value) {
    clientName.value = newName || ''
  }
})
</script>
