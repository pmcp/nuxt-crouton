<script setup lang="ts">
/**
 * Workspace Sidebar Item - Single Page in Tree
 *
 * Recursive component for rendering pages in the sidebar tree.
 * Handles expand/collapse, selection state, and visual indicators.
 */
import { useTimeAgo } from '@vueuse/core'

interface Props {
  page: any
  depth: number
  selectedId?: string | null
  isSearching?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  selectedId: null,
  isSearching: false
})

const emit = defineEmits<{
  select: [page: any]
}>()

const { locale } = useI18n()
const { getPageType } = usePageTypes()
const { getSlugForLocale } = useLocalizedSlug()

// Expand/collapse state
const isExpanded = ref(props.depth < 1) // Auto-expand first level

// Get page type info
const pageTypeInfo = computed(() => {
  if (!props.page.pageType) return null
  return getPageType(props.page.pageType)
})

// Get localized title
const localizedTitle = computed(() => {
  const translations = props.page.translations as Record<string, { title?: string }> | undefined
  return translations?.[locale.value]?.title
    || translations?.en?.title
    || props.page.title
    || 'Untitled'
})

// Get localized slug
const localizedSlug = computed(() => getSlugForLocale(props.page, locale.value))

// Relative time
const timeAgo = useTimeAgo(() => props.page.updatedAt || props.page.createdAt)

// Status config
const statusConfig: Record<string, { dotColor: string }> = {
  draft: { dotColor: 'bg-warning' },
  published: { dotColor: 'bg-success' },
  archived: { dotColor: 'bg-error' }
}

// Is this page selected?
const isSelected = computed(() => props.page.id === props.selectedId)

// Has children?
const hasChildren = computed(() => props.page.children && props.page.children.length > 0)

// Toggle expand/collapse
function toggleExpand(e: Event) {
  e.stopPropagation()
  isExpanded.value = !isExpanded.value
}

// Handle selection
function handleSelect() {
  emit('select', props.page)
}
</script>

<template>
  <div>
    <!-- Page item -->
    <div
      :class="[
        'group flex items-center gap-1.5 px-2 py-1.5 mx-1.5 rounded-md cursor-pointer transition-colors',
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-elevated'
      ]"
      :style="{ paddingLeft: `${depth * 12 + 8}px` }"
      @click="handleSelect"
    >
      <!-- Expand/collapse toggle -->
      <button
        v-if="hasChildren && !isSearching"
        class="p-0.5 -ml-1 rounded hover:bg-default/50 transition-colors"
        @click="toggleExpand"
      >
        <UIcon
          :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
          class="size-3.5 text-muted"
        />
      </button>
      <span v-else-if="!isSearching" class="w-4" />

      <!-- Page type icon -->
      <UIcon
        :name="pageTypeInfo?.icon || 'i-lucide-file'"
        :class="['size-4 shrink-0', isSelected ? 'text-primary' : 'text-muted']"
      />

      <!-- Title and slug -->
      <div class="flex-1 min-w-0">
        <span class="text-sm font-medium truncate block">
          {{ localizedTitle }}
        </span>
      </div>

      <!-- Status dot -->
      <UTooltip :text="page.status" class="capitalize">
        <span
          :class="[
            'block size-2 rounded-full shrink-0',
            statusConfig[page.status]?.dotColor || 'bg-neutral'
          ]"
        />
      </UTooltip>
    </div>

    <!-- Children (recursive) -->
    <div v-if="hasChildren && isExpanded && !isSearching">
      <CroutonPagesWorkspaceSidebarItem
        v-for="child in page.children"
        :key="child.id"
        :page="child"
        :depth="depth + 1"
        :selected-id="selectedId"
        :is-searching="isSearching"
        @select="emit('select', $event)"
      />
    </div>
  </div>
</template>
