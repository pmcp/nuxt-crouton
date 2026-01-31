<script setup lang="ts">
/**
 * Workspace Sidebar - Page Tree with Search and Drag-Drop
 *
 * Shows a hierarchical tree of pages with search filtering and drag-to-reorder.
 * Uses CroutonTreeView for full drag-drop support.
 *
 * @example
 * <CroutonPagesWorkspaceSidebar
 *   v-model="selectedPageId"
 *   @create="handleCreate"
 * />
 */
import { type Component, resolveComponent } from 'vue'

interface Props {
  /** Currently selected page ID */
  modelValue?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [id: string | null]
  'create': [parentId?: string | null]
  'select': [page: any]
}>()

const { t } = useT()
const { locale } = useI18n()
const { getSlugForLocale } = useLocalizedSlug()

// Resolve card component for tree rendering
const CroutonPagesCard = resolveComponent('CroutonPagesCard') as Component

// Search state
const searchQuery = ref('')
const searchInputRef = ref<HTMLInputElement | null>(null)

// Draft toggle and archived section state
const showDrafts = ref(true)
const archivedExpanded = ref(false)

// Ghost page state from shared composable
const { ghost: ghostPage } = useGhostPage()

// Auto-expand parent when ghost page is a child node
const treeDrag = useTreeDrag()
watch(ghostPage, (ghost) => {
  if (ghost?.parentId) {
    treeDrag.setExpanded(ghost.parentId, true)
  }
})

// Fetch pages data
const { items: pages, pending, refresh } = await useCollectionQuery<any>('pagesPages')

// Tree mutation for reordering
const { moveNode } = useTreeMutation('pagesPages')

// Build tree structure from flat pages
const buildTree = (items: any[], parentId: string | null = null): any[] => {
  if (!items) return []
  return items
    .filter((item: any) => item.parentId === parentId)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || (a.id || '').localeCompare(b.id || ''))
    .map((item: any) => ({
      ...item,
      children: buildTree(items, item.id)
    }))
}

// Get localized title for a page
const getLocalizedTitle = (page: any): string => {
  const translations = page.translations as Record<string, { title?: string }> | undefined
  return translations?.[locale.value]?.title
    || translations?.en?.title
    || page.title
    || 'Untitled'
}

// Filter pages for the main tree (excludes archived, optionally excludes drafts)
const filteredPages = computed(() => {
  if (!pages.value) return []

  let result = pages.value.filter((page: any) => {
    // Always exclude archived from main tree
    if (page.status === 'archived') return false
    // Exclude drafts unless toggle is on
    if (!showDrafts.value && page.status === 'draft') return false
    return true
  })

  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter((page: any) => {
      const title = getLocalizedTitle(page).toLowerCase()
      const slug = getSlugForLocale(page, locale.value).toLowerCase()
      return title.includes(query) || slug.includes(query)
    })
  }

  return result
})

// Archived pages (separate flat list)
const archivedPages = computed(() => {
  if (!pages.value) return []
  let archived = pages.value.filter((p: any) => p.status === 'archived')
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    archived = archived.filter((p: any) => {
      const title = getLocalizedTitle(p).toLowerCase()
      const slug = getSlugForLocale(p, locale.value).toLowerCase()
      return title.includes(query) || slug.includes(query)
    })
  }
  return archived
})

// Tree structure for display
const pageTree = computed(() => {
  let items = filteredPages.value

  // Inject ghost page if active
  if (ghostPage.value) {
    items = [...items, ghostPage.value]
  }

  // When searching, show flat list (no hierarchy)
  if (searchQuery.value.trim()) {
    return items.map((page: any) => ({
      ...page,
      children: []
    }))
  }
  return buildTree(items)
})

// Hierarchy config for tree - enable nesting
const hierarchyConfig = {
  enabled: true,
  allowNesting: true,
  parentField: 'parentId',
  orderField: 'order'
}

// Handle page selection from tree
function handleSelect(page: any) {
  emit('update:modelValue', page.id)
  emit('select', page)
}

// Handle drag-drop reorder
async function handleMove(id: string, newParentId: string | null, newOrder: number) {
  try {
    await moveNode(id, newParentId, newOrder)
    // Refresh to get updated tree
    await refresh()
  } catch (error) {
    console.error('Failed to move page:', error)
  }
}

// Handle create button
function handleCreate(parentId?: string | null) {
  console.log('[Sidebar] handleCreate called, emitting create with parentId:', parentId)
  emit('update:modelValue', null)
  emit('create', parentId ?? null)
}

// Handle tree add child page
function handleTreeCreate(parentId: string | null) {
  console.log('[Sidebar] handleTreeCreate, parentId:', parentId)
  handleCreate(parentId)
}

// Handle tree add sibling page (create below the given page)
function handleTreeCreateSibling(siblingId: string) {
  console.log('[Sidebar] handleTreeCreateSibling, siblingId:', siblingId)
  // Find the sibling page to get its parentId
  const sibling = pages.value?.find((p: any) => p.id === siblingId)
  handleCreate(sibling?.parentId ?? null)
}

// Focus search input (exposed for keyboard shortcuts)
function focusSearch() {
  searchInputRef.value?.inputRef?.el?.focus()
}

// Expose methods for parent component
defineExpose({
  focusSearch
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Search + Draft toggle (min-h matches editor header bar) -->
    <div class="flex items-center gap-2 min-h-12 px-4 py-2 border-b border-default bg-elevated/30">
      <UInput
        ref="searchInputRef"
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('pages.search') || 'Search pages...'"
        size="sm"
        class="flex-1"
      />
      <UButton
        size="xs"
        :color="showDrafts ? 'primary' : 'neutral'"
        :variant="showDrafts ? 'subtle' : 'ghost'"
        icon="i-lucide-file-pen-line"
        @click="showDrafts = !showDrafts"
      >
        Drafts
      </UButton>
    </div>

    <!-- Tree/List -->
    <div class="flex-1 overflow-auto px-2">
      <!-- Loading -->
      <div v-if="pending" class="p-3 space-y-2">
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-8 w-full" />
        <USkeleton class="h-8 w-full" />
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!pageTree.length"
        class="p-6 text-center text-muted"
      >
        <UIcon name="i-lucide-file-text" class="size-8 mb-2 opacity-50" />
        <p class="text-sm">
          {{ searchQuery ? 'No pages match your search' : 'No pages yet' }}
        </p>
        <UButton
          v-if="!searchQuery"
          size="sm"
          color="primary"
          variant="soft"
          class="mt-3"
          @click="handleCreate"
        >
          Create first page
        </UButton>
      </div>

      <!-- Page tree with drag-drop -->
      <CroutonTreeView
        v-else
        :items="pageTree"
        collection="pagesPages"
        :hierarchy="hierarchyConfig"
        :card-component="CroutonPagesCard"
        label-key="title"
        hide-actions
        show-add-button
        @select="handleSelect"
        @move="handleMove"
        @create="handleTreeCreate"
        @create-sibling="handleTreeCreateSibling"
      />

    </div>

    <!-- Archived section (pinned to bottom) -->
    <div v-if="archivedPages.length" class="border-t border-default shrink-0">
      <button
        class="flex items-center gap-2 w-full px-4 py-2 text-sm text-muted hover:text-default transition-colors"
        @click="archivedExpanded = !archivedExpanded"
      >
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 shrink-0 transition-transform duration-200"
          :class="archivedExpanded && 'rotate-90'"
        />
        <UIcon name="i-lucide-archive" class="size-4 shrink-0" />
        <span class="flex-1 text-left">Archived</span>
        <UBadge size="sm" color="neutral" variant="subtle">
          {{ archivedPages.length }}
        </UBadge>
      </button>

      <div v-if="archivedExpanded" class="overflow-auto max-h-48 px-2 pb-2">
        <div
          v-for="page in archivedPages"
          :key="page.id"
          class="px-2 py-1 rounded-md hover:bg-elevated cursor-pointer transition-colors"
          @click="handleSelect(page)"
        >
          <component
            :is="CroutonPagesCard"
            :item="page"
            layout="tree"
            collection="pagesPages"
          />
        </div>
      </div>
    </div>
  </div>
</template>
