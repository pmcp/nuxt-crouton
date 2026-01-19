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
  showInNavigation?: boolean
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

// Status config - colored dots (matches Form.vue)
const statusConfig: Record<string, { dotColor: string; label: string }> = {
  draft: { dotColor: 'bg-warning', label: 'Draft' },
  published: { dotColor: 'bg-success', label: 'Published' },
  archived: { dotColor: 'bg-error', label: 'Archived' }
}

// Visibility config - icons only, no color variation
const visibilityConfig: Record<string, { icon: string; label: string }> = {
  public: { icon: 'i-lucide-globe', label: 'Public' },
  members: { icon: 'i-lucide-users', label: 'Members Only' },
  hidden: { icon: 'i-lucide-eye-off', label: 'Hidden' }
}

const statusStyle = computed(() => statusConfig[props.item.status || ''] || statusConfig.draft)
const visibilityStyle = computed(() => visibilityConfig[props.item.visibility || ''] || visibilityConfig.public)

// Show in navigation indicator
const showInMenuLabel = computed(() =>
  props.item.showInNavigation ? 'Shown in Menu' : 'Hidden from Menu'
)
</script>

<template>
  <!-- Tree Layout: Compact inline display with status dots and visibility icons -->
  <div
    v-if="layout === 'tree'"
    class="flex items-center gap-2 flex-1 min-w-0"
  >
    <!-- Page type icon with tooltip -->
    <UTooltip :text="pageTypeInfo?.name || 'Regular Page'">
      <UIcon
        :name="pageTypeInfo?.icon || 'i-lucide-file'"
        class="size-4 shrink-0 text-muted"
      />
    </UTooltip>

    <!-- Title and slug -->
    <div class="flex-1 min-w-0">
      <span class="text-sm font-medium truncate block">
        {{ localizedTitle }}
      </span>
      <span class="text-xs text-muted truncate block">
        /{{ localizedSlug }}
      </span>
    </div>

    <!-- Right side: indicators grouped -->
    <div class="flex items-center gap-2 shrink-0">
      <!-- Relative timestamp -->
      <span class="text-xs text-muted tabular-nums">
        {{ timeAgo }}
      </span>

      <!-- Status dot -->
      <UTooltip :text="statusStyle.label">
        <span :class="['block size-2.5 rounded-full', statusStyle.dotColor]" />
      </UTooltip>

      <!-- Visibility icon -->
      <UTooltip :text="visibilityStyle.label">
        <UIcon
          :name="visibilityStyle.icon"
          class="size-4 text-muted"
        />
      </UTooltip>

      <!-- Show in menu icon -->
      <UTooltip :text="showInMenuLabel">
        <UIcon
          name="i-lucide-menu"
          :class="['size-4', item.showInNavigation ? 'text-muted' : 'opacity-30']"
        />
      </UTooltip>

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
        :name="pageTypeInfo?.icon || 'i-lucide-file'"
        class="size-5 text-muted"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium truncate">{{ localizedTitle }}</span>
        <!-- Status dot -->
        <UTooltip :text="statusStyle.label">
          <span :class="['block size-2.5 rounded-full', statusStyle.dotColor]" />
        </UTooltip>
        <!-- Visibility icon -->
        <UTooltip :text="visibilityStyle.label">
          <UIcon :name="visibilityStyle.icon" class="size-4 text-muted" />
        </UTooltip>
        <!-- Show in menu icon -->
        <UTooltip :text="showInMenuLabel">
          <UIcon
            name="i-lucide-menu"
            :class="['size-4', item.showInNavigation ? 'text-muted' : 'opacity-30']"
          />
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
          :name="pageTypeInfo?.icon || 'i-lucide-file'"
          class="size-5 text-muted"
        />
        <span class="font-medium truncate flex-1">{{ localizedTitle }}</span>
        <!-- Status dot -->
        <UTooltip :text="statusStyle.label">
          <span :class="['block size-2.5 rounded-full', statusStyle.dotColor]" />
        </UTooltip>
      </div>
    </template>

    <div class="space-y-2">
      <div class="flex items-center gap-2 text-sm text-muted">
        <!-- Visibility icon -->
        <UTooltip :text="visibilityStyle.label">
          <UIcon :name="visibilityStyle.icon" class="size-4 text-muted" />
        </UTooltip>
        <!-- Show in menu icon -->
        <UTooltip :text="showInMenuLabel">
          <UIcon
            name="i-lucide-menu"
            :class="['size-4', item.showInNavigation ? 'text-muted' : 'opacity-30']"
          />
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
