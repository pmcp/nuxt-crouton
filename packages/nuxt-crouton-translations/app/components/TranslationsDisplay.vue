<template>
  <div class="flex  gap-1.5">
    <template v-for="lang in languages" :key="lang">
      <UPopover
        v-if="getTranslationLength(lang) > 0 && getTranslationLength(lang) <= 200"
      >

        <template #default="{ open }">

          <UBadge
            :label="getBadgeLabel(lang)"
            :color="(getTranslationForLang(lang).length > 0) ? 'primary' : 'error'"
            variant="subtle"
            class="cursor-pointer"
          />
        </template>

        <template #content>
          <div class="p-3 max-w-sm">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
                {{ lang.toUpperCase() }}
                <span v-if="isUsingFallback(lang)" class="text-orange-500 ml-1">({{ tString('common.fallbackToEN') }})</span>
              </span>
              <UButton
                icon="i-lucide-copy"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="copyToClipboard(getTranslationForLang(lang))"
              />
            </div>
            <p class="text-sm break-words">{{ getTranslationForLang(lang) || tString('common.noTranslation') }}</p>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {{ getCharCount(lang) }} characters
            </div>
          </div>
        </template>
      </UPopover>

      <UBadge
        v-else-if="getTranslationLength(lang) === 0"
        :label="getBadgeLabel(lang)"
        color="neutral"
        variant="subtle"
      />

      <UBadge
        v-else
        :label="getBadgeLabel(lang)"
        :color="getTranslationForLang(lang) ? 'primary' : 'neutral'"
        variant="subtle"
        class="cursor-pointer"
        @click="openModal(lang)"
      />
    </template>

    <UModal
      v-model:open="modalOpen"
      :title="`Translation - ${selectedLang?.toUpperCase()}`"
    >
      <template #body>
        <div class="space-y-4">
          <div v-if="selectedLang && isUsingFallback(selectedLang)" class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md">
            <p class="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2">
              <UIcon name="i-lucide-info" />
              {{ tString('messages.usingEnglishFallback') }}
            </p>
          </div>
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ tString('common.content') }}</span>
              <UButton
                icon="i-lucide-copy"
                :label="tString('common.copy')"
                size="xs"
                color="neutral"
                variant="subtle"
                @click="copyToClipboard(selectedLang ? getTranslationForLang(selectedLang) : '')"
              />
            </div>
            <p class="text-sm break-words whitespace-pre-wrap">
              {{ selectedLang ? getTranslationForLang(selectedLang) : tString('messages.noTranslationAvailable') }}
            </p>
          </div>

          <div class="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div>
              <span class="font-medium">{{ tString('common.characters') }}:</span>
              {{ selectedLang ? getCharCount(selectedLang) : 0 }}
            </div>
            <div>
              <span class="font-medium">{{ tString('common.words') }}:</span>
              {{ selectedLang ? getWordCount(selectedLang) : 0 }}
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClipboard } from '@vueuse/core'

interface Props {
  translations: Record<string, string>
  languages?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  languages: () => []
})

const modalOpen = ref(false)
const selectedLang = ref<string | null>(null)
const { copy } = useClipboard()
const toast = useToast()
const { locales } = useI18n()
const { tString } = useT()

// Get available languages from i18n config or props
const languages = computed(() => {
  // If custom languages provided via props, use those
  if (props.languages && props.languages.length > 0) {
    return props.languages
  }

  // Otherwise use i18n configured locales
  if (locales.value && locales.value.length > 0) {
    return locales.value.map(locale =>
      typeof locale === 'string' ? locale : locale.code
    )
  }

  // Fallback to translation keys if available
  return Object.keys(props.translations || {})
})

// Get translation for a specific language with fallback to English
const getTranslationForLang = (lang: string): string => {
  // If translation exists for the requested language, return it
  if (props.translations?.[lang]) {
    return props.translations[lang]
  }

  // Fallback to English if available
  // if (lang !== 'en' && props.translations?.en) {
  //   return props.translations.en
  // }

  return ''
}

// Check if we're using fallback for a language
const isUsingFallback = (lang: string): boolean => {
  return lang !== 'en' && !props.translations?.[lang] && !!props.translations?.en
}

// Get badge label with fallback indicator
const getBadgeLabel = (lang: string): string => {
  const baseLabel = lang.toUpperCase()
  // if (isUsingFallback(lang)) {
  //   return `${baseLabel}*`
  // }
  return baseLabel
}

const getTranslationLength = (lang: string): number => {
  const translation = getTranslationForLang(lang)
  return translation ? translation.length : 0
}

const getCharCount = (lang: string): number => {
  return getTranslationLength(lang)
}

const getWordCount = (lang: string): number => {
  const translation = getTranslationForLang(lang)
  if (!translation) return 0
  return translation.trim().split(/\s+/).filter(word => word.length > 0).length
}

const openModal = (lang: string) => {
  selectedLang.value = lang
  modalOpen.value = true
}

const copyToClipboard = async (text: string) => {
  if (!text) {
    toast.add({
      title: tString('errors.noTextToCopy'),
      color: 'error'
    })
    return
  }

  try {
    await copy(text)
    toast.add({
      title: tString('messages.copiedToClipboard'),
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: tString('errors.failedToCopyText'),
      color: 'error'
    })
  }
}
</script>
