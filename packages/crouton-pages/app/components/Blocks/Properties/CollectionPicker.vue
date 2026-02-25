<script setup lang="ts">
/**
 * Collection Picker
 *
 * Select dropdown for choosing a collection from the registry.
 * Uses useCollections to get available collections.
 */

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const { t } = useT()

// Get available collections from registry
const { configs } = useCollections()

// Build options from collection configs
const collectionOptions = computed(() => {
  const options = Object.entries(configs).map(([key, config]) => ({
    label: config.displayName || config.name || key,
    value: key
  }))

  // Sort alphabetically
  return options.sort((a, b) => a.label.localeCompare(b.label))
})

// Handle selection change
function onChange(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="collection-picker">
    <USelect
      :model-value="modelValue"
      :items="collectionOptions"
      value-key="value"
      :placeholder="t('pages.blocks.collection.selectPlaceholder')"
      class="w-full"
      @update:model-value="onChange"
    >
      <template #leading>
        <UIcon
          name="i-lucide-database"
          class="size-4 text-muted"
        />
      </template>
    </USelect>

    <p v-if="collectionOptions.length === 0" class="text-sm text-muted mt-2">
      {{ t('pages.blocks.collection.noCollections') }}
    </p>
  </div>
</template>
