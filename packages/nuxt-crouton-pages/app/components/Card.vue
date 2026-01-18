<script setup lang="ts">
/**
 * Pages Collection Card
 *
 * Card component for displaying page items in tree, list, and grid layouts.
 * Used by CroutonCollection via the cardComponent prop.
 *
 * This component is auto-imported as CroutonPagesCard.
 */
import { useTimeAgo } from '@vueuse/core'

interface PageItem {
  id: string
  title?: string
  slug?: string
  pageType?: string
  status?: string
  visibility?: string
  updatedAt?: string | Date
  createdAt?: string | Date
  translations?: Record<string, { title?: string; slug?: string }>
  [key: string]: any
}

interface Props {
  item: PageItem
  layout?: 'tree' | 'list' | 'grid'
  collection?: string
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'tree',
  collection: 'pagesPages'
})

const { getPageType } = usePageTypes()
const { locale } = useI18n()
const { getSlugForLocale } = useLocalizedSlug()

// Get page type info for icon
const pageTypeInfo = computed(() => {
  if (!props.item.pageType) return null
  return getPageType(props.item.pageType)
})

// Get localized title with fallbacks
const localizedTitle = computed(() => {
  const translations = props.item.translations as Record<string, { title?: string }> | undefined
  return translations?.[locale.value]?.title
    || translations?.en?.title
    || props.item.title
    || 'Untitled'
})

// Get localized slug with fallbacks
const localizedSlug = computed(() => getSlugForLocale(props.item, locale.value))

// Relative time ago
const timeAgo = useTimeAgo(() => props.item.updatedAt || props.item.createdAt)

// Status config - colored icons (matches Form.vue)
const statusConfig: Record<string, { icon: string; color: string; label: string }> = {
  draft: { icon: 'i-lucide-pencil', color: 'text-warning', label: 'Draft' },
  published: { icon: 'i-lucide-check', color: 'text-success', label: 'Published' },
  archived: { icon: 'i-lucide-archive', color: 'text-error', label: 'Archived' }
}

// Visibility config - icons only, no color variation
const visibilityConfig: Record<string, { icon: string; label: string }> = {
  public: { icon: 'i-lucide-globe', label: 'Public' },
  members: { icon: 'i-lucide-users', label: 'Members Only' },
  hidden: { icon: 'i-lucide-eye-off', label: 'Hidden' }
}

const statusStyle = computed(() => statusConfig[props.item.status || ''] || statusConfig.draft)
const visibilityStyle = computed(() => visibilityConfig[props.item.visibility || ''] || visibilityConfig.public)
</script>

<template>
  <!-- Tree Layout: Compact inline display with status dots and visibility icons -->
  <div
    v-if="layout === 'tree'"
    class="flex items-center gap-2 flex-1 min-w-0"
  >
    <!-- Page type icon -->
    <UIcon
      :name="pageTypeInfo?.icon || 'i-lucide-file-text'"
      class="size-4 shrink-0 text-muted"
    />

    <!-- Title and slug -->
    <div class="flex-1 min-w-0">
      <span class="text-sm font-medium truncate block">
        {{ localizedTitle }}
      </span>
      <span class="text-xs text-muted truncate block">
        /{{ localizedSlug }}
      </span>
    </div>

    <!-- Right side: visibility icon, status dot, timestamp -->
    <div class="flex items-center gap-3 shrink-0">
      <!-- Visibility icon -->
      <UTooltip :text="visibilityStyle.label">
        <UIcon
          :name="visibilityStyle.icon"
          class="size-4 text-muted"
        />
      </UTooltip>

      <!-- Status icon -->
      <UTooltip :text="statusStyle.label">
        <UIcon
          :name="statusStyle.icon"
          :class="['size-4', statusStyle.color]"
        />
      </UTooltip>

      <!-- Relative timestamp -->
      <span class="text-xs text-muted tabular-nums w-20 text-right">
        {{ timeAgo }}
      </span>

      <!-- Presence slot for collab badges -->
      <slot name="presence" />
    </div>
  </div>

  <!-- List Layout: Row display with more details -->
  <div
    v-else-if="layout === 'list'"
    class="flex items-center gap-3 py-1"
  >
    <!-- Page type icon -->
    <div class="shrink-0 size-10 rounded-lg bg-elevated flex items-center justify-center">
      <UIcon
        :name="pageTypeInfo?.icon || 'i-lucide-file-text'"
        class="size-5 text-muted"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium truncate">{{ localizedTitle }}</span>
        <!-- Status icon -->
        <UTooltip :text="statusStyle.label">
          <UIcon :name="statusStyle.icon" :class="['size-4', statusStyle.color]" />
        </UTooltip>
        <!-- Visibility icon -->
        <UTooltip :text="visibilityStyle.label">
          <UIcon :name="visibilityStyle.icon" class="size-4 text-muted" />
        </UTooltip>
      </div>
      <div class="flex items-center gap-2 text-sm text-muted">
        <span class="font-mono">/{{ localizedSlug }}</span>
        <span v-if="pageTypeInfo" class="text-xs">{{ pageTypeInfo.name }}</span>
        <span class="text-xs">{{ timeAgo }}</span>
      </div>
    </div>

    <!-- Presence slot -->
    <slot name="presence" />
  </div>

  <!-- Grid Layout: Card display -->
  <UCard
    v-else
    class="hover:ring-1 hover:ring-primary/50 transition-all cursor-pointer"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon
          :name="pageTypeInfo?.icon || 'i-lucide-file-text'"
          class="size-5 text-muted"
        />
        <span class="font-medium truncate flex-1">{{ localizedTitle }}</span>
        <!-- Status icon -->
        <UTooltip :text="statusStyle.label">
          <UIcon :name="statusStyle.icon" :class="['size-4', statusStyle.color]" />
        </UTooltip>
      </div>
    </template>

    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm text-muted">
        <!-- Visibility icon -->
        <UTooltip :text="visibilityStyle.label">
          <UIcon :name="visibilityStyle.icon" class="size-4 text-muted" />
        </UTooltip>
        <span class="font-mono truncate">/{{ localizedSlug }}</span>
      </div>
      <div v-if="pageTypeInfo" class="text-xs text-muted">
        {{ pageTypeInfo.name }}
      </div>
      <div class="text-xs text-muted">
        {{ timeAgo }}
      </div>
    </div>

    <!-- Presence slot -->
    <template #footer>
      <slot name="presence" />
    </template>
  </UCard>
</template>
