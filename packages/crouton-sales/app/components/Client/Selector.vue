<template>
  <!-- No visible label — the select's placeholder/icon carry the meaning, and
       the row lines up with the category-tabs row beside it. -->
  <div class="p-1 -m-1 rounded-lg" :class="highlight ? 'border border-warning bg-warning/5' : ''">
    <!-- Dropdown with search and create — clients are always the reusable
         kind; there is no free-text mode. -->
    <USelectMenu
      v-model="selectedValue"
      :items="allClients"
      value-key="id"
      label-key="title"
      :placeholder="t('sales.client.selectOrCreate')"
      :aria-label="t('sales.client.label')"
      icon="i-lucide-user"
      size="lg"
      class="w-full"
      searchable
    >
      <template #default="{ modelValue }">
        <span v-if="modelValue" class="truncate">
          {{ getClientLabel(modelValue as string) }}
        </span>
        <span v-else class="text-dimmed truncate">
          {{ t('sales.client.selectOrCreate') }}
        </span>
      </template>

      <template #content-top>
        <div class="p-1">
          <UButton
            color="neutral"
            icon="i-lucide-plus"
            variant="soft"
            block
            @click="openCreateModal"
          >
            {{ t('sales.client.createNew', 'Create new client') }}
          </UButton>
        </div>
      </template>
    </USelectMenu>

    <!-- Create client modal -->
    <UModal
      v-model:open="createModalOpen"
      :title="t('sales.client.createNew', 'Create new client')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UFormField :label="t('sales.client.nameLabel', 'Client name')" required>
          <UInput
            v-model="newClientName"
            :placeholder="t('sales.client.namePlaceholder', 'Enter client name')"
            size="xl"
            class="w-full"
            @keyup.enter="createClient"
          />
        </UFormField>
      </template>

      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          @click="close"
        >
          {{ t('common.cancel', 'Cancel') }}
        </UButton>
        <UButton
          color="primary"
          :loading="creating"
          :disabled="!newClientName.trim()"
          @click="createClient"
        >
          {{ t('common.create', 'Create') }}
        </UButton>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { SalesClient } from '../../types'

const { t } = useT()

const props = defineProps<{
  clients: SalesClient[]
  highlight?: boolean
  clientId?: string | null
  /** Event ID for helper-scoped client creation (volunteer/POS flows) */
  eventId?: string
}>()

const emit = defineEmits<{
  'update:clientId': [clientId: string | null]
  'update:clientName': [clientName: string]
  'client-created': [client: SalesClient]
}>()

const selectedValue = ref<string>('')
const creating = ref(false)
const createModalOpen = ref(false)
const newClientName = ref('')

// Track newly created clients (with their IDs)
const createdClients = ref<SalesClient[]>([])

// Combine existing clients with any newly created items
const allClients = computed(() => [...props.clients, ...createdClients.value])

// Client label helper
const clientLabelsMap = computed(() => {
  const map = new Map<string, string>()
  for (const client of allClients.value) {
    map.set(client.id, client.title)
  }
  return map
})

const getClientLabel = (id: string): string => {
  return clientLabelsMap.value.get(id) || id
}

const { token } = useHelperAuth()

const openCreateModal = () => {
  newClientName.value = ''
  createModalOpen.value = true
}

// Handle creating a new client
async function createClient() {
  const title = newClientName.value.trim()
  if (!title) return

  creating.value = true
  try {
    let newClient: { id: string; title: string } | null = null

    if (props.eventId && token.value) {
      // Volunteer/POS flow: use helper-scoped endpoint
      newClient = await $fetch<{ id: string; title: string }>(`/api/crouton-sales/events/${props.eventId}/clients`, {
        method: 'POST',
        body: { title },
        headers: { 'x-helper-token': token.value }
      })
    }

    if (newClient?.id) {
      const client = { id: newClient.id, title: newClient.title }
      createdClients.value.push(client)
      selectedValue.value = newClient.id
      emit('update:clientId', newClient.id)
      emit('update:clientName', newClient.title)
      emit('client-created', client)
      createModalOpen.value = false
      newClientName.value = ''
    }
  }
  catch (error) {
    console.error('Failed to create client:', error)
  }
  finally {
    creating.value = false
  }
}

// Emit selection changes
watch(selectedValue, (value) => {
  if (!value) return

  const client = allClients.value.find(c => c.id === value)
  if (client) {
    emit('update:clientId', client.id)
    emit('update:clientName', client.title)
  }
})

// Sync with external props (for clearing/resetting)
watch(() => props.clientId, (newId) => {
  selectedValue.value = newId || ''
})
</script>
