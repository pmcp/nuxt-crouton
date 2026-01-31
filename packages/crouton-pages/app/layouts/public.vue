<script setup lang="ts">
/**
 * Public Layout
 *
 * Layout for public-facing pages like /[team]/[slug].
 * Features a floating pill-style navigation inspired by Nuxt UI portfolio template.
 *
 * Supports three layout modes via pageLayout injection:
 * - default: Normal scrollable content with max-width and padding
 * - full-height: Fixed viewport height, content fills remaining space (for apps like bookings)
 * - full-screen: No padding, full viewport (for landing pages)
 *
 * Inline editing:
 * - A UDrawer slides up from the bottom with scale-background effect.
 * - Tree panel on the left (desktop), editor on the right.
 * - On mobile the tree is hidden, editor fills full width.
 */
import { useMediaQuery } from '@vueuse/core'

// Get page layout from shared state (set by page component via useState)
const pageLayout = useState<'default' | 'full-height' | 'full-screen'>('pageLayout', () => 'default')

// Inline editing state (shared with page route via useState)
const isEditing = useState<boolean>('pageEditing', () => false)
const editingPageId = useState<string | null>('editingPageId', () => null)

// Responsive: hide tree on mobile
const isDesktop = useMediaQuery('(min-width: 1024px)')

// Handle tree page selection
function onTreeSelect(page: any) {
  editingPageId.value = page?.id ?? null
  isCreating.value = false
}

// Create mode state
const isCreating = ref(false)
const createParentId = ref<string | null>(null)

// Ghost page state for sidebar tree
const { setGhost, clearGhost } = useGhostPage()

// Handle create from sidebar tree
function onTreeCreate(parentId?: string | null) {
  // Guard against PointerEvent being passed from @click handlers
  const resolvedParentId = (parentId && typeof parentId === 'string') ? parentId : null
  console.log('[Layout] onTreeCreate, parentId:', resolvedParentId)
  editingPageId.value = null
  createParentId.value = resolvedParentId
  isCreating.value = true
  setGhost(resolvedParentId)
}

// Handle editor save — stay in drawer, switch to editing the saved page
function handleEditorSave(page: any) {
  isCreating.value = false
  clearGhost()
  if (page?.id) {
    editingPageId.value = page.id
  }
}

// Handle editor close
function handleEditorClose() {
  isEditing.value = false
  editingPageId.value = null
  isCreating.value = false
  clearGhost()
}

// Handle editor cancel — stay in drawer, clear creation state
function handleEditorCancel() {
  editingPageId.value = null
  isCreating.value = false
  clearGhost()
}

// Handle editor delete — clear selection but keep drawer open
function handleEditorDelete() {
  editingPageId.value = null
  isCreating.value = false
}

// Drawer open state wrapping isEditing
const drawerOpen = computed({
  get: () => isEditing.value,
  set: (val: boolean) => {
    if (!val) {
      handleEditorClose()
    }
  }
})

// Refs for manual DOM update after hydration (to fix SSR mismatch)
const containerRef = ref<HTMLElement>()
const mainRef = ref<HTMLElement>()

// Apply layout classes to DOM elements
// Needed because: 1) SSR hydration mismatch, 2) navigation between pages
function applyLayoutClasses() {
  if (!containerRef.value || !mainRef.value) return

  const container = containerRef.value
  const main = mainRef.value

  switch (pageLayout.value) {
    case 'full-height':
      container.className = 'bg-background h-screen flex flex-col overflow-hidden'
      main.className = 'flex-1 overflow-hidden pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8'
      break
    case 'full-screen':
      container.className = 'bg-background min-h-screen'
      main.className = 'pt-16'
      break
    default:
      container.className = 'bg-background min-h-screen'
      main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8'
  }
}

// Apply on mount (fixes SSR hydration mismatch)
onMounted(() => {
  nextTick(applyLayoutClasses)
})

// Watch for layout changes (handles navigation between pages)
watch(pageLayout, () => {
  nextTick(applyLayoutClasses)
})

// Compute layout-specific classes (used for SSR, then manually fixed after hydration)
const containerClasses = computed(() => {
  switch (pageLayout.value) {
    case 'full-height':
      return 'h-screen flex flex-col overflow-hidden'
    case 'full-screen':
      return 'min-h-screen'
    default:
      return 'min-h-screen'
  }
})

const mainClasses = computed(() => {
  switch (pageLayout.value) {
    case 'full-height':
      return 'flex-1 overflow-hidden pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8'
    case 'full-screen':
      return 'pt-16'
    default:
      return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8'
  }
})
</script>

<template>
  <div ref="containerRef" class="bg-background" :class="containerClasses">
    <!-- Floating navigation -->
    <CroutonPagesNav />

    <!-- Page content -->
    <main ref="mainRef" :class="mainClasses">
      <slot />
    </main>

    <!-- Editing drawer (slides up from bottom with scale-background effect) -->
    <UDrawer
      v-model:open="drawerOpen"
      should-scale-background
      :dismissible="false"
      :handle="false"
      inset
      :ui="{ content: 'h-[85vh]' }"
    >
      <template #content>
        <div class="flex h-full">
          <!-- Tree (desktop only) -->
          <div v-if="isDesktop" class="w-72 shrink-0 overflow-y-auto border-r border-default">
            <CroutonPagesWorkspaceSidebar
              :model-value="editingPageId"
              @update:model-value="editingPageId = $event"
              @select="onTreeSelect"
              @create="onTreeCreate"
            />
          </div>

          <!-- Editor -->
          <div class="flex-1 min-w-0 overflow-y-auto">
            <CroutonPagesInlineEditor
              v-if="editingPageId || isCreating"
              :page-id="editingPageId"
              :default-parent-id="isCreating ? createParentId : null"
              @save="handleEditorSave"
              @cancel="handleEditorCancel"
              @delete="handleEditorDelete"
              @close="handleEditorClose"
            />
            <div v-else class="flex items-center justify-center h-full text-muted">
              <div class="text-center space-y-2">
                <UIcon name="i-lucide-file-text" class="size-8 mx-auto opacity-50" />
                <p class="text-sm">Select a page to edit</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
