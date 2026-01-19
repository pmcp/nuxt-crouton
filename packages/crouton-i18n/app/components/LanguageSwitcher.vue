<template>
  <USelect
    :model-value="locale"
    :items="localeItems"
    value-key="code"
    class="w-auto"
    variant="ghost"
    :ui="{ trailingIcon: 'size-4' }"
    @update:model-value="handleLocaleChange"
  />
</template>

<script setup lang="ts">
const { locale, setLocale } = useI18n()

const localeItems = [
  { code: 'en', label: 'EN' },
  { code: 'nl', label: 'NL' },
  { code: 'fr', label: 'FR' }
]

const handleLocaleChange = async (newLocale: string) => {
  await setLocale(newLocale)
}
</script>
