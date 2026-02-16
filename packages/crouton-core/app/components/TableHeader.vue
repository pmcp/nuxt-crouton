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
        <span>Create <span class="hidden md:inline">{{ useFormatCollections().collectionWithCapitalSingular(collection) }}</span></span>
      </UButton>
    </template>
  </UDashboardNavbar>
</template>

<script setup>
const { open } = useCrouton()

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  collection: {
    type: String,
    default: ''
  },
  createButton: {
    type: Boolean,
    default: false
  },
  exportButton: {
    type: Boolean,
    default: true
  },
  importButton: {
    type: Boolean,
    default: true
  },
  rows: {
    type: Array,
    default: () => []
  }
})

// Theme variant support
const getVariant = (base) => {
  try {
    const switcher = useThemeSwitcher?.()
    return switcher?.getVariant?.(base) ?? base
  } catch {
    return base
  }
}

const handleCreate = () => {
  open('create', props.collection)
}
</script>
