<script setup lang="ts">
/**
 * WorkspaceEditor - Generic inline editor for workspace layout
 *
 * Loads item data and renders CroutonFormDynamicLoader inline.
 * Handles loading, error states, and save/delete/cancel events.
 */

interface Props {
  collection: string
  itemId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  itemId: null
})

const emit = defineEmits<{
  'save': [item: any]
  'delete': [id: string]
  'cancel': []
}>()

const { t } = useT()
const { getConfig } = useCollections()

// Resolve the form action
const action = computed<'create' | 'update'>(() =>
  props.itemId ? 'update' : 'create'
)

// Loading and error state
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const activeItem = ref<any>(null)

// Get API path from collection config
const collectionConfig = getConfig(props.collection)
const apiPath = collectionConfig?.apiPath

// Load item data when itemId changes
watch(
  () => props.itemId,
  async (newId) => {
    if (!newId) {
      // Create mode
      activeItem.value = null
      loadError.value = null
      return
    }

    // Update mode — fetch item
    isLoading.value = true
    loadError.value = null

    try {
      const { getTeamId } = useTeamContext()
      const teamId = getTeamId()

      if (!teamId || !apiPath) {
        throw new Error('Team context or API path not available')
      }

      const response = await $fetch<any>(`/api/teams/${teamId}/${apiPath}`, {
        method: 'GET',
        query: { ids: newId },
        credentials: 'include'
      })

      const item = response?.items?.[0] || response?.[0] || response
      if (!item) {
        throw new Error('Item not found')
      }

      activeItem.value = item
    } catch (error: any) {
      loadError.value = error.message || 'Failed to load item'
      console.error('WorkspaceEditor: Failed to load item:', error)
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true }
)

// Listen for crouton mutation events to detect saves/deletes from within the form
const nuxtApp = useNuxtApp()
nuxtApp.hook('crouton:mutation', ({ operation, collection, itemId }) => {
  if (collection !== props.collection) return

  if (operation === 'create' || operation === 'update') {
    emit('save', { id: itemId })
  } else if (operation === 'delete') {
    emit('delete', itemId as string)
  }
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Loading -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted mb-2" />
        <p class="text-sm text-muted">{{ t('common.loading') || 'Loading...' }}</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-lucide-alert-circle" class="size-8 text-error mb-2" />
        <p class="text-sm text-error">{{ loadError }}</p>
        <UButton
          size="sm"
          color="primary"
          variant="soft"
          class="mt-3"
          @click="emit('cancel')"
        >
          {{ t('common.back') || 'Back' }}
        </UButton>
      </div>
    </div>

    <!-- Form -->
    <div v-else class="flex-1 min-h-0 overflow-auto">
      <CroutonFormDynamicLoader
        :key="`${collection}-${action}-${activeItem?.id || 'new'}`"
        :collection="collection"
        loading="notLoading"
        :action="action"
        :items="activeItem ? [activeItem.id] : []"
        :active-item="activeItem"
      />
    </div>
  </div>
</template>
