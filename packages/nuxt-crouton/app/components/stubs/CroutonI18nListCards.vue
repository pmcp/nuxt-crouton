<template>
  <div
    v-if="item?.translations"
    class="flex flex-wrap gap-1"
  >
    <UBadge
      v-for="locale in availableLocales"
      :key="locale"
      :color="hasTranslation(locale) ? 'success' : 'neutral'"
      variant="soft"
      size="xs"
    >
      {{ locale.toUpperCase() }}
    </UBadge>
  </div>
  <span
    v-else
    class="text-muted"
  >
    —
  </span>
</template>

<script setup lang="ts">
// Stub component - overridden by nuxt-crouton-i18n when installed
// Provides basic translation indicator fallback

interface Props {
  item?: { translations?: Record<string, any> } | null
  fields?: string[]
}

const props = defineProps<Props>()

const availableLocales = computed(() => {
  if (!props.item?.translations) return []
  return Object.keys(props.item.translations)
})

const hasTranslation = (locale: string) => {
  if (!props.item?.translations?.[locale]) return false
  if (!props.fields?.length) return true
  return props.fields.some(field => props.item?.translations?.[locale]?.[field])
}
</script>
