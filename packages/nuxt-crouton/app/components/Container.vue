<!-- Container.vue -->
<template>
  <!-- Modals -->
  <UModal
    v-for="(state, index) in modalStates"
    :key="state.id"
    v-model:open="state.isOpen"
    :title="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    :description="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    size="lg"
    @update:open="(val: boolean) => handleClose(state.id, val)"
    @after:leave="() => handleAfterLeave(state.id)"
  >
    <template #content="{ close }">
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
        <CroutonLoading v-if="state.loading !== 'notLoading'" class="h-full w-full"/>
        <div v-else>
          <CroutonDynamicFormLoader
            :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
            :collection="state.collection"
            :loading="state.loading"
            :action="state.action"
            :items="state.items"
            :activeItem="state.activeItem"
          />
        </div>
      </div>
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
          <CroutonLoading v-if="state.loading !== 'notLoading'" class="h-full w-full"/>
          <div v-else>
            <CroutonDynamicFormLoader
              :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
              :collection="state.collection"
              :loading="state.loading"
              :action="state.action"
              :items="state.items"
              :activeItem="state.activeItem"
            />
          </div>
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
    :description="`${state.action ? state.action.charAt(0).toUpperCase() + state.action.slice(1) : ''} ${getCollectionName(state.collection)}`"
    side="right"
    :ui="getSlideoverUi(state, index)"
    :style="getSlideoverStyle(state, index)"
    :class="[
      `crouton-slideover-level-${index}`,
      state.isExpanded ? 'crouton-slideover-expanded' : ''
    ]"
    @update:open="(val: boolean) => handleSlideoverClose(state.id, val)"
    @after:leave="() => handleAfterLeave(state.id)"
  >
    <!-- Enhanced header with expand button -->
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-2">
          <span v-if="getPreviousSlideover(index) && !state.isExpanded" class="text-md">
            {{ getPreviousSlideover(index)?.action }} {{ getPreviousSlideover(index)?.collection }} >
          </span>
          <h2>
            <span class="capitalize">{{ state.action }}</span>
            {{ getCollectionName(state.collection) }}
          </h2>
        </div>
        <div class="flex items-center gap-2">
          <!-- Expand/Collapse button -->
          <UButton
            :icon="state.isExpanded ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'"
            variant="ghost"
            color="gray"
            size="xs"
            :title="state.isExpanded ? 'Collapse to sidebar' : 'Expand to fullscreen'"
            @click.stop="toggleExpand(state.id)"
          />
          <!-- Close button -->
          <UButton
            icon="i-lucide-x"
            variant="ghost"
            color="gray"
            size="xs"
            @click.stop="close(state.id)"
          />
        </div>
      </div>
    </template>

    <!-- Body content -->
    <template #body>
      <div v-if="state.isOpen && state.collection" class="w-full h-full">
         <CroutonLoading v-if="state.loading !== 'notLoading'" class="h-full w-full"/>
        <div v-else>
          <CroutonDynamicFormLoader
            :key="`${state.collection}-${state.action}-${state.activeItem?.id || 'new'}-${state.id}`"
            :collection="state.collection"
            :loading="state.loading"
            :action="state.action"
            :items="state.items"
            :activeItem="state.activeItem"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'

// Type definitions
type CroutonAction = 'create' | 'update' | 'delete' | null
type LoadingState = 'notLoading' | 'create_send' | 'update_send' | 'delete_send' | 'create_open' | 'update_open' | 'delete_open'

interface CroutonState {
  id: string
  action: CroutonAction
  collection: string | null
  activeItem: any
  items: any[]
  loading: LoadingState
  isOpen: boolean
  containerType: 'slideover' | 'modal' | 'dialog'
  isExpanded?: boolean  // Track expand state for each slideover
}

interface CroutonComposableReturn {
  croutonStates: Ref<CroutonState[]>
  close: (stateId?: string) => void
  closeAll: () => void
  removeState: (stateId: string) => void
}

interface FormatCollectionsReturn {
  collectionWithCapitalSingular: (collection: string) => string
}

// Use the composables
const { croutonStates, close, closeAll, removeState }: CroutonComposableReturn = useCrouton()
const { collectionWithCapitalSingular }: FormatCollectionsReturn = useFormatCollections()

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
  if (state.isExpanded) {
    // Fullscreen mode - keep right anchor but expand width
    return {
      ui: {
        variants: {
          side: {
            right: {
              content: 'left-0 inset-y-0 w-full w-max-full'
            }
          }
        }
      }
    }
  }

  // Default slideover UI (standard right-side panel)
  return {}
}

// Get dynamic style based on expand state with smooth transitions
const getSlideoverStyle = (state: CroutonState, index: number) => {
  const baseZIndex = 40 + (index * 10)

  // For expanded state, only adjust positioning, let CSS handle width
  if (state.isExpanded) {
    return {
      zIndex: baseZIndex + 100, // Higher z-index when expanded
      transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      top: '0',
      height: '100vh'
    }
  }

  // Cascading offsets for stacked view
  return {
    zIndex: baseZIndex,
    transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
    top: `${index * 40}px`,
    height: `calc(100vh - ${index * 40}px)`
  }
}

// Clean up on unmount
onBeforeUnmount(() => {
  closeAll()
})
</script>

<style scoped>


</style>
