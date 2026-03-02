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
const { locale, locales, setLocale } = useI18n()

const localeItems = computed(() =>
  locales.value.map((l: any) => {
    const code = typeof l === 'string' ? l : l.code
    return { code, label: code.toUpperCase() }
  })
)

const handleLocaleChange = async (newLocale: string) => {
  await setLocale(newLocale)
}
</script>
