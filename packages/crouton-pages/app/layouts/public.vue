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
 * - A floating editor card slides in from the right, below the nav.
 * - The left edge has a drag handle to resize the panel wider/narrower.
 * - When the panel is wide enough to overlap page content, the content
 *   smoothly slides left to make room.
 * - On mobile the editor opens as a slideover instead.
 */
import { useMediaQuery } from '@vueuse/core'

// Get page layout from shared state (set by page component via useState)
const pageLayout = useState<'default' | 'full-height' | 'full-screen'>('pageLayout', () => 'default')

// Inline editing state (shared with page route via useState)
const isEditing = useState<boolean>('pageEditing', () => false)
const editingPageId = useState<string | null>('editingPageId', () => null)

// Responsive: use slideover on mobile
const isDesktop = useMediaQuery('(min-width: 1024px)')

// --- Resizable editor panel ---
const EDITOR_MIN_WIDTH = 360
const EDITOR_DEFAULT_WIDTH = 480
const EDITOR_RIGHT_GAP = 16 // right-4 = 1rem = 16px
const EDITOR_TOP_GAP = 80 // top-20 = 5rem = 80px
const EDITOR_BOTTOM_GAP = 16 // bottom-4

const editorWidth = ref(EDITOR_DEFAULT_WIDTH)
const isDragging = ref(false)

// Clamp editor width to viewport bounds
function clampWidth(w: number): number {
  const maxW = typeof window !== 'undefined'
    ? Math.round(window.innerWidth * 0.85)
    : 1200
  return Math.max(EDITOR_MIN_WIDTH, Math.min(w, maxW))
}

// Drag handle logic using pointer events
function onDragStart(e: PointerEvent) {
  e.preventDefault()
  isDragging.value = true
  const startX = e.clientX
  const startWidth = editorWidth.value

  const onMove = (ev: PointerEvent) => {
    // Dragging left = increasing width (startX - ev.clientX is positive)
    const delta = startX - ev.clientX
    editorWidth.value = clampWidth(startWidth + delta)
  }

  const onUp = () => {
    isDragging.value = false
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }

  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
}

// Compute how much right padding the main content needs so it doesn't
// sit underneath the editor panel. Only applies when editing on desktop.
const contentPaddingRight = computed(() => {
  if (!isEditing.value || !isDesktop.value) return 0
  // The editor occupies editorWidth + EDITOR_RIGHT_GAP from the right edge.
  // Add a small gap (24px) between content and editor.
  return editorWidth.value + EDITOR_RIGHT_GAP + 24
})

// Reset editor width when closing
watch(isEditing, (editing) => {
  if (!editing) {
    editorWidth.value = EDITOR_DEFAULT_WIDTH
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

// Dynamic inline style for main content: adds right padding when editor is open
const mainStyle = computed(() => {
  if (contentPaddingRight.value > 0) {
    return { paddingRight: `${contentPaddingRight.value}px` }
  }
  return {}
})

// Handle editor save
function handleEditorSave() {
  isEditing.value = false
  editingPageId.value = null
}

// Handle editor close
function handleEditorClose() {
  isEditing.value = false
  editingPageId.value = null
}

// Mobile slideover model bound to isEditing (only used on mobile)
const slideoverOpen = computed({
  get: () => isEditing.value && !isDesktop.value,
  set: (val: boolean) => {
    if (!val) {
      handleEditorClose()
    }
  }
})
</script>

<template>
  <div ref="containerRef" class="bg-background" :class="containerClasses">
    <!-- Floating navigation -->
    <CroutonPagesNav />

    <!-- Page content (full width, padding adjusts when editor is open) -->
    <main
      ref="mainRef"
      :class="mainClasses"
      :style="mainStyle"
      class="transition-[padding] duration-300 ease-in-out"
    >
      <slot />
    </main>

    <!-- Desktop: Floating resizable editor card -->
    <ClientOnly>
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-200 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <UCard
          v-if="isEditing && isDesktop && editingPageId"
          variant="outline"
          class="fixed z-30 shadow-2xl overflow-hidden !p-0"
          :ui="{ root: 'flex flex-col', body: 'flex-1 min-h-0 !p-0' }"
          :style="{
            top: `${EDITOR_TOP_GAP}px`,
            right: `${EDITOR_RIGHT_GAP}px`,
            bottom: `${EDITOR_BOTTOM_GAP}px`,
            width: `${editorWidth}px`
          }"
        >
          <!-- Drag handle (left edge) -->
          <div
            class="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group flex items-center"
            @pointerdown="onDragStart"
          >
            <div
              class="w-1 h-12 rounded-full mx-auto transition-colors"
              :class="isDragging ? 'bg-primary' : 'bg-muted/40 group-hover:bg-muted'"
            />
          </div>

          <!-- Editor content -->
          <div class="flex-1 min-w-0 min-h-0">
            <CroutonPagesInlineEditor
              :page-id="editingPageId"
              :panel-width="editorWidth"
              @save="handleEditorSave"
              @close="handleEditorClose"
            />
          </div>
        </UCard>
      </Transition>
    </ClientOnly>

    <!-- Disable text selection while dragging -->
    <Teleport to="body">
      <div v-if="isDragging" class="fixed inset-0 z-50 cursor-col-resize" />
    </Teleport>

    <!-- Mobile: Editor as slideover -->
    <ClientOnly>
      <USlideover
        v-model:open="slideoverOpen"
        side="right"
      >
        <template #content="{ close }">
          <div v-if="editingPageId" class="h-full">
            <CroutonPagesInlineEditor
              :page-id="editingPageId"
              @save="() => { handleEditorSave(); close() }"
              @close="() => { handleEditorClose(); close() }"
            />
          </div>
        </template>
      </USlideover>
    </ClientOnly>
  </div>
</template>
