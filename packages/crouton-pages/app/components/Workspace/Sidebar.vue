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
  'create': []
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

// Fetch pages data
const { items: pages, pending, refresh } = await useCollectionQuery<any>('pagesPages')

// Tree mutation for reordering
const { moveNode } = useTreeMutation('pagesPages')

// Build tree structure from flat pages
const buildTree = (items: any[], parentId: string | null = null): any[] => {
  if (!items) return []
  return items
    .filter((item: any) => item.parentId === parentId)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
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

// Filter pages by search query
const filteredPages = computed(() => {
  if (!pages.value || !searchQuery.value.trim()) {
    return pages.value || []
  }

  const query = searchQuery.value.toLowerCase()
  return pages.value.filter((page: any) => {
    const title = getLocalizedTitle(page).toLowerCase()
    const slug = getSlugForLocale(page, locale.value).toLowerCase()
    return title.includes(query) || slug.includes(query)
  })
})

// Tree structure for display
const pageTree = computed(() => {
  // When searching, show flat list (no hierarchy)
  if (searchQuery.value.trim()) {
    return filteredPages.value.map((page: any) => ({
      ...page,
      children: []
    }))
  }
  return buildTree(filteredPages.value)
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
function handleCreate() {
  emit('update:modelValue', null)
  emit('create')
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header with title and create button -->
    <div class="flex items-center justify-between px-3 py-2 border-b border-default">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="size-4 text-muted" />
        <span class="font-medium text-sm">{{ t('pages.title') || 'Pages' }}</span>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="xs"
        color="primary"
        variant="ghost"
        @click="handleCreate"
      />
    </div>

    <!-- Search -->
    <div class="px-3 py-2 border-b border-default">
      <UInput
        ref="searchInputRef"
        v-model="searchQuery"
        icon="i-lucide-search"
        :placeholder="t('pages.search') || 'Search pages...'"
        size="sm"
        class="w-full"
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
        @select="handleSelect"
        @move="handleMove"
      />
    </div>
  </div>
</template>
