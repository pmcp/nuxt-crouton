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

// Draft toggle
const showDrafts = ref(true)

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

// Reorder mode
const reorderMode = useReorderMode()

function toggleReorderMode() {
  if (reorderMode.isActive.value) {
    reorderMode.deactivate()
  } else if (!pending.value && pages.value) {
    reorderMode.activate(pages.value)
  }
}

async function handlePublish() {
  await reorderMode.publish(async (id, parentId, order) => {
    await moveNode(id, parentId, order)
  })
  await refresh()
}

function handleDiscard() {
  reorderMode.discard()
}

// Build tree structure from flat pages
// When scoped is true, items whose parent is not in the set are treated as roots
const buildTree = (items: any[], parentId: string | null = null, scoped = false): any[] => {
  if (!items) return []
  const ids = scoped ? new Set(items.map((i: any) => i.id)) : null
  const roots = scoped
    ? items.filter((item: any) => !item.parentId || !ids!.has(item.parentId))
    : items.filter((item: any) => item.parentId === parentId)

  return roots
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || (a.id || '').localeCompare(b.id || ''))
    .map((item: any) => ({
      ...item,
      children: buildChildren(items, item.id)
    }))
}

const buildChildren = (items: any[], parentId: string): any[] => {
  return items
    .filter((item: any) => item.parentId === parentId)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0) || (a.id || '').localeCompare(b.id || ''))
    .map((item: any) => ({
      ...item,
      children: buildChildren(items, item.id)
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
  const source = reorderMode.isActive.value ? reorderMode.localPages.value : pages.value
  if (!source) return []

  let result = source.filter((page: any) => {
    // Always exclude archived from main tree
    if (page.status === 'archived') return false
    // Exclude pages hidden from navigation
    if (page.showInNavigation === false) return false
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

// Pages hidden from navigation
const hiddenPages = computed(() => {
  if (!pages.value) return []
  let hidden = pages.value.filter((p: any) => p.showInNavigation === false && p.status !== 'archived')
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    hidden = hidden.filter((p: any) => {
      const title = getLocalizedTitle(p).toLowerCase()
      const slug = getSlugForLocale(p, locale.value).toLowerCase()
      return title.includes(query) || slug.includes(query)
    })
  }
  return hidden
})

// Hidden pages as a tree (parents outside the set become roots)
const hiddenTree = computed(() => {
  let items = hiddenPages.value
  if (ghostSection.value === 'hidden') {
    items = [...items, ghostPage.value!]
  }
  if (searchQuery.value.trim()) {
    return items.map((p: any) => ({ ...p, children: [] }))
  }
  return buildTree(items, null, true)
})

// Archived pages
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

// Archived pages as a tree (parents outside the set become roots)
const archivedTree = computed(() => {
  let items = archivedPages.value
  if (ghostSection.value === 'archived') {
    items = [...items, ghostPage.value!]
  }
  if (searchQuery.value.trim()) {
    return items.map((p: any) => ({ ...p, children: [] }))
  }
  return buildTree(items, null, true)
})

// Bottom sections accordion items (only shown when they have content)
const bottomSections = computed(() => {
  const sections = []
  if (hiddenPages.value.length) {
    sections.push({
      label: 'Hidden',
      icon: 'i-lucide-eye-off',
      value: 'hidden',
      slot: 'hidden' as const,
      _count: hiddenPages.value.length
    })
  }
  if (archivedPages.value.length) {
    sections.push({
      label: 'Archived',
      icon: 'i-lucide-archive',
      value: 'archived',
      slot: 'archived' as const,
      _count: archivedPages.value.length
    })
  }
  return sections
})

// Determine which section the ghost page belongs to based on its parent
const ghostSection = computed<'main' | 'hidden' | 'archived' | null>(() => {
  if (!ghostPage.value || reorderMode.isActive.value) return null
  const parentId = ghostPage.value.parentId
  if (!parentId) return 'main'
  const parent = pages.value?.find((p: any) => p.id === parentId)
  if (!parent) return 'main'
  if (parent.status === 'archived') return 'archived'
  if (parent.showInNavigation === false) return 'hidden'
  return 'main'
})

// Tree structure for display
const pageTree = computed(() => {
  let items = filteredPages.value

  // Inject ghost page if it belongs to the main tree
  if (ghostSection.value === 'main') {
    items = [...items, ghostPage.value!]
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
  // In reorder mode, apply locally without API calls
  if (reorderMode.isActive.value) {
    reorderMode.applyLocalMove(id, newParentId, newOrder)
    return
  }

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
      <UButton
        size="xs"
        :color="reorderMode.isActive.value ? 'primary' : 'neutral'"
        :variant="reorderMode.isActive.value ? 'subtle' : 'ghost'"
        icon="i-lucide-arrow-up-down"
        :disabled="pending"
        @click="toggleReorderMode"
      />
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

    <!-- Reorder mode floating action bar -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-2 opacity-0"
    >
      <div
        v-if="reorderMode.isActive.value && reorderMode.hasChanges.value"
        class="shrink-0 border-t border-default bg-elevated/80 backdrop-blur px-4 py-2 flex items-center gap-2"
      >
        <span class="text-sm text-muted flex-1">
          {{ reorderMode.changeCount.value }} {{ reorderMode.changeCount.value === 1 ? 'change' : 'changes' }}
        </span>
        <UButton
          size="xs"
          color="neutral"
          variant="ghost"
          @click="handleDiscard"
        >
          Discard
        </UButton>
        <UButton
          size="xs"
          color="primary"
          :loading="reorderMode.publishing.value"
          @click="handlePublish"
        >
          Publish
        </UButton>
      </div>
    </Transition>

    <!-- Hidden / Archived sections -->
    <UAccordion
      v-if="bottomSections.length"
      type="multiple"
      :items="bottomSections"
      :ui="{
        root: 'border-t border-default shrink-0',
        trigger: 'px-4 py-2 text-sm text-muted hover:text-default',
        content: 'px-2 pb-2',
        leadingIcon: 'size-4',
      }"
    >
      <template #trailing="{ item }">
        <UBadge size="sm" color="neutral" variant="subtle">
          {{ item._count }}
        </UBadge>
      </template>

      <template #hidden-body>
        <div class="overflow-auto max-h-64">
          <CroutonTreeView
            :items="hiddenTree"
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
      </template>

      <template #archived-body>
        <div class="overflow-auto max-h-64">
          <CroutonTreeView
            :items="archivedTree"
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
      </template>
    </UAccordion>
  </div>
</template>
