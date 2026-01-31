<script setup lang="ts">
/**
 * Pages Workspace - Finder-style Page Editor
 *
 * A split-view workspace for managing pages using UDashboardPanel:
 * - Left panel: Resizable page tree with search
 * - Right panel: Inline page editor
 *
 * URL state is preserved via query param: ?page=<pageId>
 */
import { breakpointsTailwind, onKeyStroke } from '@vueuse/core'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { t } = useT()
const route = useRoute()
const router = useRouter()
// Selected page ID from URL or state
const selectedPageId = ref<string | null>(null)

// Mode: 'view' | 'create' | 'edit'
const mode = ref<'view' | 'create' | 'edit'>('view')

// Parent ID for new pages (set when creating from tree context)
const createParentId = ref<string | null>(null)

// Stable key for editor — only changes on explicit page switch or new create, NOT on save
const editorSessionKey = ref(0)

// Initialize from URL query
onMounted(() => {
  const pageId = route.query.page as string | undefined
  if (pageId) {
    selectedPageId.value = pageId
    mode.value = 'edit'
  }
})

// Sync URL when selection changes
watch(selectedPageId, (newId) => {
  const query = { ...route.query }
  if (newId) {
    query.page = newId
  } else {
    delete query.page
  }
  router.replace({ query })
})

// Handle page selection from sidebar
function handleSelectPage(page: any) {
  selectedPageId.value = page.id
  mode.value = 'edit'
  editorSessionKey.value++
}

// Handle create button (optionally with a parent ID from tree context)
function handleCreate(parentId?: string | null) {
  selectedPageId.value = null
  createParentId.value = parentId ?? null
  mode.value = 'create'
  editorSessionKey.value++
}

// Handle save - refresh tree and update selection
function handleSave(savedPage: any) {
  if (savedPage?.id) {
    selectedPageId.value = savedPage.id
    mode.value = 'edit'
  }
  // Tree will auto-refresh via query invalidation
}

// Handle delete — editor already performed the deletion, just clean up UI
function handleDelete() {
  selectedPageId.value = null
  mode.value = 'view'
}

// Handle cancel (go back to view mode)
function handleCancel() {
  if (mode.value === 'create') {
    mode.value = 'view'
    selectedPageId.value = null
  }
}

// Show editor when we have a selection or in create mode
const showEditor = computed(() => mode.value === 'create' || (mode.value === 'edit' && selectedPageId.value))

// Mobile handling
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const isEditorPanelOpen = computed({
  get() {
    return showEditor.value
  },
  set(value: boolean) {
    if (!value) {
      selectedPageId.value = null
      mode.value = 'view'
    }
  }
})

// Sidebar ref for keyboard shortcuts
const sidebarRef = ref<{ focusSearch: () => void } | null>(null)

// Keyboard shortcuts
// N - Create new page (only when not in an input)
onKeyStroke('n', (e) => {
  const target = e.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
  if (!isInput && !showEditor.value) {
    e.preventDefault()
    handleCreate()
  }
})

// / - Focus search (only when not in an input)
onKeyStroke('/', (e) => {
  const target = e.target as HTMLElement
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
  if (!isInput) {
    e.preventDefault()
    sidebarRef.value?.focusSearch()
  }
})
</script>

<template>
  <!-- Panel 1: Resizable sidebar with page tree -->
  <UDashboardPanel
    id="pages-sidebar"
    :default-size="25"
    :min-size="15"
    :max-size="40"
    resizable
  >
    <UDashboardNavbar :title="t('pages.workspace.title') || 'Pages'">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>

      <template #right>
        <UButton
          color="primary"
          variant="ghost"
          icon="i-lucide-plus"
          size="sm"
          @click="handleCreate"
        />
      </template>
    </UDashboardNavbar>

    <CroutonPagesWorkspaceSidebar
      ref="sidebarRef"
      v-model="selectedPageId"
      @select="handleSelectPage"
      @create="handleCreate"
    />
  </UDashboardPanel>

  <!-- Panel 2: Editor (desktop) -->
  <UDashboardPanel id="pages-editor" class="hidden lg:flex">
    <template v-if="showEditor">
      <CroutonPagesWorkspaceEditor
        :key="editorSessionKey"
        :page-id="selectedPageId"
        :default-parent-id="mode === 'create' ? createParentId : null"
        @save="handleSave"
        @delete="handleDelete"
        @cancel="handleCancel"
      />
    </template>

    <CroutonPagesWorkspaceEmptyState
      v-else
      @create="handleCreate"
    />
  </UDashboardPanel>

  <!-- Mobile: Slideover for editor -->
  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isEditorPanelOpen" side="right">
      <template #content>
        <CroutonPagesWorkspaceEditor
          v-if="showEditor"
          :key="editorSessionKey"
          :page-id="selectedPageId"
          :default-parent-id="mode === 'create' ? createParentId : null"
          @save="handleSave"
          @delete="handleDelete"
          @cancel="handleCancel"
        />
      </template>
    </USlideover>
  </ClientOnly>
</template>
