<script setup lang="ts">
/**
 * PageEditor SEO Preview Panel
 *
 * Renders both search-result and social (Open Graph) previews for a page.
 * Used inside CroutonI18nInput slot templates (#group-extra and #group-extra-secondary).
 *
 * @example
 * <CroutonPagesEditorSeoPreview
 *   :team-slug="teamSlug"
 *   :translations="state.translations"
 *   :og-image="state.ogImage"
 *   :preview-locale="locale"
 * />
 */

interface Props {
  /** The team slug used to build the breadcrumb URL path in the search preview */
  teamSlug: string | null | undefined
  /** All locale translations keyed by locale code */
  translations: Record<string, { title?: string; slug?: string; seoTitle?: string; seoDescription?: string }> | unknown
  /** OG/social image URL */
  ogImage?: string | null
  /** The locale currently displayed in the preview */
  previewLocale: string
}

const props = withDefaults(defineProps<Props>(), {
  ogImage: null
})

// Internal tab state — each instance tracks its own active tab
const activeTab = ref<'search' | 'social'>('search')

const { t } = useT()

// Typed accessor so templates don't need repeated casts
const translationForLocale = computed(() => {
  const t = props.translations as Record<string, { title?: string; slug?: string; seoTitle?: string; seoDescription?: string }> | undefined
  return t?.[props.previewLocale] ?? {}
})
</script>

<template>
  <div class="mt-3 space-y-2">
    <div class="flex items-center gap-1.5 text-xs text-muted/70 select-none">
      <UIcon name="i-lucide-eye" class="size-3" />
      <span>{{ t('pages.editor.preview') }}</span>
    </div>

    <!-- Tab switcher -->
    <div class="flex rounded border border-default overflow-hidden text-xs">
      <button
        type="button"
        :class="['flex-1 py-1 transition-colors', activeTab === 'search' ? 'bg-elevated text-foreground font-medium' : 'text-muted hover:text-foreground']"
        @click="activeTab = 'search'"
      >{{ t('pages.editor.search') }}</button>
      <button
        type="button"
        :class="['flex-1 py-1 transition-colors border-l border-default', activeTab === 'social' ? 'bg-elevated text-foreground font-medium' : 'text-muted hover:text-foreground']"
        @click="activeTab = 'social'"
      >{{ t('pages.editor.social') }}</button>
    </div>

    <!-- Google Search Preview -->
    <div v-if="activeTab === 'search'" class="rounded-lg border border-default bg-background p-3 space-y-1">
      <div class="flex gap-3">
        <div class="flex-1 space-y-1 min-w-0">
          <div class="flex items-center gap-1.5 text-xs text-muted truncate">
            <UIcon name="i-lucide-globe" class="size-3 shrink-0" />
            <span class="truncate">
              {{ teamSlug }} › {{ previewLocale }}<template v-if="translationForLocale.slug"> › {{ translationForLocale.slug }}</template>
            </span>
          </div>
          <div class="text-sm font-normal leading-snug text-blue-700 dark:text-blue-400">
            {{ translationForLocale.seoTitle || translationForLocale.title || t('pages.seo.pageTitle') }}
          </div>
          <div class="text-xs text-muted leading-relaxed line-clamp-2">
            {{ translationForLocale.seoDescription || t('pages.seo.noDescription') }}
          </div>
        </div>
        <div v-if="ogImage" class="shrink-0 size-16 rounded overflow-hidden bg-muted">
          <img :src="ogImage" class="w-full h-full object-cover" alt="" />
        </div>
      </div>
    </div>

    <!-- OG / Social Preview -->
    <div v-else class="rounded-lg border border-default overflow-hidden">
      <div class="aspect-[1200/630] bg-muted/30 overflow-hidden">
        <img v-if="ogImage" :src="ogImage" class="w-full h-full object-cover" alt="" />
        <div v-else class="w-full h-full flex flex-col items-center justify-center gap-2 text-muted/60">
          <UIcon name="i-lucide-image" class="size-8" />
          <span class="text-xs">{{ t('pages.seo.noSocialImage') }}</span>
        </div>
      </div>
      <div class="p-2.5 bg-background border-t border-default space-y-0.5">
        <div class="text-xs text-muted uppercase tracking-wide">{{ teamSlug }}</div>
        <div class="text-sm font-medium leading-snug">
          {{ translationForLocale.seoTitle || translationForLocale.title || t('pages.seo.pageTitle') }}
        </div>
        <div v-if="translationForLocale.seoDescription" class="text-xs text-muted leading-relaxed line-clamp-2">
          {{ translationForLocale.seoDescription }}
        </div>
      </div>
    </div>
  </div>
</template>
