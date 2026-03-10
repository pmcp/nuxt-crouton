<template>
  <UDashboardNavbar :title="collection || 'Data'">
    <template #left>
      <h2>
        {{ title }}
      </h2>
    </template>
    <template #right>
      <slot name="extraButtons" />

      <CroutonImportButton
        v-if="importButton && collection"
        :collection="collection"
        @import-complete="$emit('import-complete')"
      />

      <CroutonExportButton
        v-if="exportButton && rows?.length"
        :collection="collection"
        :rows="rows"
      />

      <UButton
        v-if="createButton"
        color="primary"
        size="md"
        :variant="getVariant('solid')"
        @click="handleCreate"
      >
        <span>{{ t('common.create') }} <span class="hidden md:inline">{{ useFormatCollections().collectionWithCapitalSingular(collection) }}</span></span>
      </UButton>
    </template>
  </UDashboardNavbar>
</template>

<script setup lang="ts">
const { t } = useT()
const { open } = useCrouton()
const { getConfig } = useCollections()

const props = withDefaults(defineProps<{
  title?: string
  collection?: string
  createButton?: boolean
  exportButton?: boolean
  importButton?: boolean
  rows?: any[]
}>(), {
  title: '',
  collection: '',
  createButton: false,
  exportButton: true,
  importButton: true,
  rows: () => []
})

// Theme variant support
const getVariant = (base: string) => {
  try {
    // @ts-expect-error useThemeSwitcher is from optional crouton-themes package
    const switcher = useThemeSwitcher?.()
    return switcher?.getVariant?.(base) ?? base
  } catch {
    return base
  }
}

const handleCreate = () => {
  const container = getConfig(props.collection)?.container ?? 'slideover'
  open('create', props.collection, [], container)
}
</script>
