<template>
  <div class="fixed top-4 right-4 z-50">
    <UDropdownMenu
      :items="dropdownItems"
      :ui="{
        content: 'bg-black border-gray-800',
        item: 'text-white hover:bg-white/10 data-highlighted:bg-white/10',
        itemLeadingIcon: 'text-white/75'
      }"
    >
      <UButton
        size="sm"
        class="bg-black hover:bg-gray-900 text-white rounded-full px-3 py-1.5 shadow-lg hover:shadow-xl transition-all duration-200 border-0"
        :ui="{
          base: 'font-semibold uppercase tracking-wide text-xs'
        }"
      >
        {{ currentLocaleCode }}
      </UButton>
    </UDropdownMenu>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale, locales, setLocale } = useI18n()

const currentLocaleCode = computed(() => {
  return locale.value.toUpperCase()
})

const dropdownItems = computed<DropdownMenuItem[]>(() => {
  return locales.value.map(loc => {
    const code = typeof loc === 'string' ? loc : loc.code
    const name = typeof loc === 'string' ? code.toUpperCase() : (loc.name || code.toUpperCase())

    return {
      label: name,
      icon: locale.value === code ? 'i-lucide-check' : undefined,
      onSelect: () => setLocale(code)
    }
  })
})
</script>
