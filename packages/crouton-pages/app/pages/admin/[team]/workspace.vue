<script setup lang="ts">
/**
 * Pages Workspace - Finder-style Page Editor
 *
 * A split-view workspace for managing pages:
 * - Left sidebar: Page tree with search
 * - Right panel: Inline page editor
 *
 * URL state is preserved via query param: ?page=<pageId>
 */

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'team-admin']
})

const { t } = useT()
const route = useRoute()
const router = useRouter()
const crouton = useCrouton()

// Selected page ID from URL or state
const selectedPageId = ref<string | null>(null)

// Mode: 'view' | 'create' | 'edit'
const mode = ref<'view' | 'create' | 'edit'>('view')

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
}

// Handle create button
function handleCreate() {
  selectedPageId.value = null
  mode.value = 'create'
}

// Handle save - refresh tree and update selection
function handleSave(savedPage: any) {
  if (savedPage?.id) {
    selectedPageId.value = savedPage.id
    mode.value = 'edit'
  }
  // Tree will auto-refresh via query invalidation
}

// Handle delete
async function handleDelete(pageId: string) {
  // Open delete confirmation using standard Crouton flow
  crouton.open('delete', 'pagesPages', [pageId])

  // Watch for close and refresh
  const unwatch = watch(
    () => crouton.showCrouton.value,
    (show) => {
      if (!show) {
        // Clear selection after delete
        selectedPageId.value = null
        mode.value = 'view'
        unwatch()
      }
    }
  )
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
</script>

<template>
  <UDashboardPanel grow>
    <UDashboardNavbar :title="t('pages.workspace.title') || 'Pages Workspace'">
      <template #leading>
        <UIcon name="i-lucide-layout-grid" class="size-5" />
      </template>

      <template #right>
        <UTooltip text="Switch to list view">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-list"
            size="sm"
            :to="`/admin/${route.params.team}/pages`"
          />
        </UTooltip>
      </template>
    </UDashboardNavbar>

    <CroutonPagesWorkspaceLayout class="flex-1">
      <template #sidebar>
        <CroutonPagesWorkspaceSidebar
          v-model="selectedPageId"
          @select="handleSelectPage"
          @create="handleCreate"
        />
      </template>

      <!-- Editor or empty state -->
      <CroutonPagesWorkspaceEditor
        v-if="showEditor"
        :key="selectedPageId || 'new'"
        :page-id="selectedPageId"
        @save="handleSave"
        @delete="handleDelete"
        @cancel="handleCancel"
      />

      <CroutonPagesWorkspaceEmptyState
        v-else
        @create="handleCreate"
      />
    </CroutonPagesWorkspaceLayout>
  </UDashboardPanel>
</template>
