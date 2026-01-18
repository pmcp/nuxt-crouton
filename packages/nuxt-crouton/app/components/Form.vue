<!-- _Form.vue -->
<template>
  <!-- Modals -->
  <UModal
    v-for="(state, index) in modalStates"
    :key="state.id"
    v-model:open="state.isOpen"
    :title="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    :description="`Form for ${state.action || 'managing'} ${getCollectionName(state.collection)}`"
    size="lg"
    @update:open="(val: boolean) => handleClose(state.id, val)"
    @after:leave="() => handleAfterLeave(state.id)"
  >
    <template #body>
      <CroutonLoading
        v-if="state.loading !== 'notLoading'"
        class="h-full w-full"
      />

      <CroutonFormDynamicLoader
        v-else
        :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
        :collection="state.collection ?? undefined"
        :loading="state.loading"
        :action="state.action"
        :items="state.items"
        :active-item="state.activeItem"
      />
    </template>
  </UModal>

  <!-- Dialogs -->
  <UModal
    v-for="(state, index) in dialogStates"
    :key="state.id"
    v-model:open="state.isOpen"
    :title="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    :description="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    @update:open="(val: boolean) => handleClose(state.id, val)"
    @after:leave="() => handleAfterLeave(state.id)"
  >
    <template #content="{ close }">
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h2>
            <span class="capitalize">{{ state.action }}</span>
            {{ getCollectionName(state.collection) }}
          </h2>
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            size="xs"
            @click.stop="close()"
          />
        </div>

        <div class="w-full">
          <CroutonLoading
            v-if="state.loading !== 'notLoading'"
            class="h-full w-full"
          />
          <CroutonFormDynamicLoader
            v-else
            :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
            :collection="state.collection ?? undefined"
            :loading="state.loading"
            :action="state.action"
            :items="state.items"
            :active-item="state.activeItem"
          />
        </div>
      </div>
    </template>
  </UModal>

  <!-- Expandable Slideovers -->
  <USlideover
    v-for="(state, index) in slideoverStates"
    :key="state.id"
    v-model:open="state.isOpen"
    :title="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    :description="`Form for ${state.action || 'managing'} ${getCollectionName(state.collection)}`"
    side="right"
    :close="false"
    :ui="getSlideoverUi(state, index)"
    :style="getSlideoverStyle(state, index)"
    :class="[
      `crouton-slideover-level-${index}`,
      state.isExpanded ? 'crouton-slideover-expanded' : ''
    ]"
    @update:open="(val: boolean) => handleSlideoverClose(state.id, val)"
    @after:leave="() => handleAfterLeave(state.id)"
  >
    <!-- Enhanced actions with presence avatars, expand button, and close -->
    <template #actions>
      <div class="flex items-center gap-2 ml-auto">
        <!-- Collab presence avatars (shows who else is editing) -->
        <!-- TODO: Re-add :current-user-id="currentUserId" after testing to exclude self -->
        <CollabEditingBadge
          v-if="state.action === 'update' && state.activeItem?.id && hasCollabSupport"
          :room-id="`${state.collection}-${state.activeItem.id}`"
          :room-type="state.collection || 'generic'"
          :poll-interval="5000"
          size="sm"
          variant="avatars"
        />

        <!-- Expand/Collapse button -->
        <UButton
          :icon="state.isExpanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
          variant="ghost"
          color="neutral"
          size="xs"
          :title="state.isExpanded ? 'Collapse to sidebar' : 'Expand to fullscreen'"
          @click.stop="toggleExpand(state.id)"
        />

        <!-- Close button (inline with other actions) -->
        <UButton
          icon="i-lucide-x"
          variant="ghost"
          color="neutral"
          size="xs"
          title="Close"
          @click.stop="handleSlideoverClose(state.id, false)"
        />
      </div>
    </template>

    <!-- Body content -->
    <template #body>
      <div
        v-if="state.isOpen && state.collection"
        class="w-full h-full "
      >
        <CroutonLoading
          v-if="state.loading !== 'notLoading'"
          class="h-full w-full"
        />
        <CroutonFormDynamicLoader
          v-else
          :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
          :collection="state.collection"
          :loading="state.loading"
          :action="state.action"
          :items="state.items"
          :active-item="state.activeItem"
        />
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { CroutonState } from '../composables/useCrouton'

// Use the composables - destructure only needed properties
const { croutonStates, close, closeAll, removeState } = useCrouton()
const { collectionWithCapitalSingular } = useFormatCollections()

// Check if collab support is available (CollabEditingBadge component exists)
const hasCollabSupport = computed(() => {
  try {
    const component = resolveComponent('CollabEditingBadge')
    const isAvailable = typeof component !== 'string' // resolveComponent returns string if not found
    console.log('[CroutonForm] hasCollabSupport:', isAvailable, 'component type:', typeof component)
    return isAvailable
  } catch (e) {
    console.log('[CroutonForm] hasCollabSupport check failed:', e)
    return false
  }
})

// Get current user for presence
const currentUser = computed(() => {
  try {
    // @ts-expect-error - useSession may not exist if auth package not installed
    if (typeof useSession === 'function') {
      // @ts-expect-error - conditional call
      const { user } = useSession()
      if (user?.value) {
        return {
          id: user.value.id,
          name: user.value.name || user.value.email || 'Anonymous'
        }
      }
    }
  } catch {
    // Auth package not installed
  }
  return null
})

const currentUserId = computed(() => currentUser.value?.id || null)

// Track active collab WebSocket connections for each slideover
const collabWebSockets = ref<Map<string, WebSocket>>(new Map())

// Set up collab presence for a state using simple WebSocket
const setupCollabPresence = (state: CroutonState) => {
  console.log('[CroutonForm] setupCollabPresence called for:', state.collection, state.id)

  if (import.meta.server) {
    console.log('[CroutonForm] Skipping - SSR')
    return
  }
  if (!hasCollabSupport.value) {
    console.log('[CroutonForm] Skipping - no collab support')
    return
  }
  if (state.action !== 'update') {
    console.log('[CroutonForm] Skipping - action is not update:', state.action)
    return
  }
  if (!state.activeItem?.id) {
    console.log('[CroutonForm] Skipping - no activeItem.id')
    return
  }

  // Skip if already connected
  if (collabWebSockets.value.has(state.id)) {
    console.log('[CroutonForm] Skipping - already connected')
    return
  }

  const roomId = `${state.collection}-${state.activeItem.id}`
  const roomType = state.collection || 'generic'

  console.log('[CroutonForm] Creating WebSocket for room:', roomId, 'type:', roomType)

  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/api/collab/${roomId}/ws?type=${roomType}`

    console.log('[CroutonForm] WebSocket URL:', url)
    const ws = new WebSocket(url)
    collabWebSockets.value.set(state.id, ws)

    ws.onopen = () => {
      console.log('[CroutonForm] WebSocket connected for room:', roomId)
      // Send awareness message to register presence
      const user = currentUser.value
      console.log('[CroutonForm] Current user:', user)
      if (user) {
        const awarenessMessage = JSON.stringify({
          type: 'awareness',
          userId: user.id,
          state: {
            user: {
              id: user.id,
              name: user.name,
              color: `hsl(${Math.abs(user.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 70%, 50%)`
            }
          }
        })
        console.log('[CroutonForm] Sending awareness:', awarenessMessage)
        ws.send(awarenessMessage)
      }
    }

    ws.onerror = (e) => {
      console.log('[CroutonForm] Collab presence WebSocket error:', e)
    }
  } catch (e) {
    console.log('[CroutonForm] Collab presence setup failed:', e)
  }
}

// Clean up collab WebSocket when slideover closes
const cleanupCollabPresence = (stateId: string) => {
  const ws = collabWebSockets.value.get(stateId)
  if (ws) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close()
    } else if (ws.readyState === WebSocket.CONNECTING) {
      ws.onopen = () => ws.close()
    }
  }
  collabWebSockets.value.delete(stateId)
}

// Filter states by container type
const modalStates = computed(() =>
  croutonStates.value.filter(state => state.containerType === 'modal')
)

const dialogStates = computed(() =>
  croutonStates.value.filter(state => state.containerType === 'dialog')
)

const slideoverStates = computed(() =>
  croutonStates.value.filter(state => state.containerType === 'slideover' || !state.containerType)
)

// Watch for new slideover states and set up collab presence
watch(slideoverStates, (states) => {
  console.log('[CroutonForm] slideoverStates changed, count:', states.length)
  for (const state of states) {
    console.log('[CroutonForm] State:', state.collection, state.action, 'isOpen:', state.isOpen, 'activeItem?.id:', state.activeItem?.id)
    if (state.isOpen && state.action === 'update' && state.activeItem?.id) {
      setupCollabPresence(state)
    }
  }
}, { deep: true, immediate: true })

// Get formatted collection name
const getCollectionName = (collection: string | null): string => {
  return collection ? collectionWithCapitalSingular(collection) : ''
}

// Helper for getting previous slideover safely
const getPreviousSlideover = (index: number) => {
  const prev = slideoverStates.value[index - 1]
  if (index > 0 && prev) {
    return {
      action: prev.action,
      collection: getCollectionName(prev.collection)
    }
  }
  return null
}

// Simple close handler for modals/dialogs
const handleClose = (stateId: string, isOpen: boolean): void => {
  if (!isOpen) {
    const state = croutonStates.value.find(s => s.id === stateId)
    if (state) state.isOpen = false
  }
}

// Handle slideover close event - just update the open state
const handleSlideoverClose = (stateId: string, isOpen: boolean): void => {
  if (!isOpen) {
    // Find the state and set isOpen to false to trigger animation
    const state = slideoverStates.value.find(s => s.id === stateId)
    if (state) {
      state.isOpen = false
    }
  }
}

// Handle after leave animation complete - actually remove the state
const handleAfterLeave = (stateId: string): void => {
  cleanupCollabPresence(stateId)
  removeState(stateId)
}

// Toggle expand/collapse state for a slideover
const toggleExpand = (stateId: string): void => {
  const state = slideoverStates.value.find(s => s.id === stateId)
  if (state) {
    state.isExpanded = !state.isExpanded
  }
}

// Get dynamic UI configuration based on expand state
const getSlideoverUi = (state: CroutonState, index: number) => {
  const baseTransition = 'transition-[width,max-width,left,right] duration-[400ms] ease-in-out'

  if (state.isExpanded) {
    // Fullscreen mode - override to full width
    return {
      content: `fixed inset-0 w-screen max-w-none ${baseTransition}`,
      overlay: 'fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity duration-300',
      body: `flex-1 overflow-y-auto p-6 ${baseTransition}`,
      header: 'flex items-center gap-1.5 p-4 sm:px-6 min-h-16 border-b border-gray-200 dark:border-gray-700'
    }
  }

  // Sidebar mode - right-side panel with custom width
  return {
    content: `fixed right-0 inset-y-0 w-full max-w-2xl ${baseTransition}`,
    body: `flex-1 overflow-y-auto p-4 ${baseTransition}`,
    header: 'flex items-center gap-1.5 p-4 sm:px-6 min-h-16 border-b border-gray-200 dark:border-gray-700'
  }
}

// Get dynamic style based on expand state with smooth transitions
const getSlideoverStyle = (state: CroutonState, index: number) => {
  const baseZIndex = 40 + (index * 10)

  // For expanded state, only adjust positioning, let CSS handle width
  if (state.isExpanded) {
    return {
      zIndex: baseZIndex + 100
      // Remove transition from inline styles - handle in CSS
    }
  }
  // Cascading offsets for stacked view
  return {
    zIndex: baseZIndex,
    top: `${index * 40}px`,
    height: `calc(100vh - ${index * 40}px)`
    // Remove transition from inline styles
  }
}

// Clean up on unmount
onBeforeUnmount(() => {
  closeAll()
})
</script>

<style scoped>
/* Smooth animations for all slideover levels */
:deep(.crouton-slideover-level-0 [data-headlessui-state="open"]),
:deep(.crouton-slideover-level-1 [data-headlessui-state="open"]),
:deep(.crouton-slideover-level-2 [data-headlessui-state="open"]),
:deep(.crouton-slideover-level-3 [data-headlessui-state="open"]),
:deep(.crouton-slideover-level-4 [data-headlessui-state="open"]) {
  transition: width 400ms ease-in-out,
  max-width 400ms ease-in-out,
  left 400ms ease-in-out,
  right 400ms ease-in-out !important;
}

/* When expanded, override to fullscreen */
:deep(.crouton-slideover-expanded [data-headlessui-state="open"]) {
  left: 0 !important;
  right: 0 !important;
  width: 100vw !important;
  max-width: none !important;
}

/* Expanded body gets more padding */
:deep(.crouton-slideover-expanded .p-4) {
  padding: 1.5rem !important;
}
</style>
