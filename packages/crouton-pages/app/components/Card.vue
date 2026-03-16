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
const { locale, t } = useI18n()
const { getSlugForLocale } = useLocalizedSlug()

// Get page type info for icon
const pageTypeInfo = computed(() => {
  if (!props.item.pageType) return null
  return getPageType(props.item.pageType) as { name: string; icon?: string; [key: string]: any } | undefined
})

// Get localized title with fallbacks
const localizedTitle = computed(() => {
  const translations = props.item.translations as Record<string, { title?: string }> | undefined
  return translations?.[locale.value]?.title
    || translations?.en?.title
    || props.item.title
    || t('pages.untitled')
})

// Get localized slug with fallbacks
const localizedSlug = computed(() => getSlugForLocale(props.item, locale.value))

// Relative time ago
const timeAgo = useTimeAgo(() => props.item.updatedAt || props.item.createdAt || new Date())

// Status config - colored dots (matches Form.vue)
const statusConfig = computed<Record<string, { dotColor: string; label: string }>>(() => ({
  draft: { dotColor: 'bg-warning', label: t('pages.status.draft') },
  published: { dotColor: 'bg-success', label: t('pages.status.published') },
  archived: { dotColor: 'bg-error', label: t('pages.status.archived') }
}))

// Visibility config - icons only, no color variation
const visibilityConfig = computed<Record<string, { icon: string; label: string }>>(() => ({
  public: { icon: 'i-lucide-globe', label: t('pages.visibility.public') },
  members: { icon: 'i-lucide-users', label: t('pages.visibility.members') },
  admin: { icon: 'i-lucide-shield', label: t('pages.visibility.admin') },
  hidden: { icon: 'i-lucide-eye-off', label: t('pages.visibility.hidden') }
}))

const statusStyle = computed(() => statusConfig.value[props.item.status || ''] || statusConfig.value.draft!)
const visibilityStyle = computed(() => visibilityConfig.value[props.item.visibility || ''] || visibilityConfig.value.public!)

// Show in navigation indicator
const showInMenuLabel = computed(() =>
  props.item.showInNavigation ? t('pages.editor.shownInMenu') : t('pages.editor.hiddenFromMenu')
)
</script>

<template>
  <!-- Tree Layout: Two-line display -->
  <div
    v-if="layout === 'tree'"
    :class="[
      'flex items-center gap-2 flex-1 min-w-0 py-0.5',
      !item.showInNavigation && 'opacity-60'
    ]"
  >
    <!-- Page type icon -->
    <UTooltip :text="pageTypeInfo?.name || $t('pages.editor.regularPage')">
      <UIcon
        :name="pageTypeInfo?.icon || 'i-lucide-file'"
        class="size-4 text-muted shrink-0"
      />
    </UTooltip>

    <!-- Title and slug stacked -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium truncate">
        {{ localizedTitle }}
      </div>
      <div class="text-xs text-muted truncate">
        /{{ localizedSlug }}
      </div>
    </div>

    <!-- Icons on the right -->
    <div class="flex items-center gap-1.5 shrink-0">
      <!-- Hidden from menu indicator (first) -->
      <UTooltip v-if="!item.showInNavigation" :text="$t('pages.editor.hiddenFromNavigation')">
        <UIcon
          name="i-lucide-eye-off"
          class="size-3.5 text-muted"
        />
      </UTooltip>

      <!-- Status dot -->
      <UTooltip :text="statusStyle.label">
        <span :class="['block size-2 rounded-full', statusStyle.dotColor]" />
      </UTooltip>

      <!-- Visibility icon -->
      <UTooltip :text="visibilityStyle.label">
        <UIcon
          :name="visibilityStyle.icon"
          class="size-3.5 text-muted"
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
