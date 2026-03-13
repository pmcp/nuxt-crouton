<script setup lang="ts">
/**
 * Footer Renderer Component
 *
 * Renders a footer page inside a UFooter layout.
 * Used by CroutonPagesRenderer when pageType is 'pages:footer'.
 * Block content goes in the #top slot, bottom bar shows copyright + social links.
 */
import { detectContentFormat } from '../utils/content-detector'

interface Props {
  page: {
    id: string
    content?: string | null
    config?: Record<string, unknown> | null
    translations?: Record<string, { content?: string }>
    [key: string]: unknown
  }
}

const props = defineProps<Props>()

const { locale: i18nLocale } = useI18n()

// Resolve localized content
const localizedContent = computed(() => {
  const translations = props.page.translations
  if (translations) {
    const localeData = translations[i18nLocale.value] || translations.en
    if (localeData?.content) return localeData.content
  }
  return props.page.content
})

const contentFormat = computed(() => detectContentFormat(localizedContent.value))

const year = new Date().getFullYear()
</script>

<template>
  <UFooter>
    <template #top>
      <UContainer>
        <CroutonPagesBlockContent
          v-if="contentFormat === 'blocks'"
          :content="localizedContent"
        />
        <CroutonPagesRegularContent
          v-else-if="contentFormat === 'html'"
          :content="localizedContent"
        />
      </UContainer>
    </template>

    <template #left>
      <p class="text-sm text-muted">
        &copy; {{ year }}
      </p>
    </template>
  </UFooter>
</template>
