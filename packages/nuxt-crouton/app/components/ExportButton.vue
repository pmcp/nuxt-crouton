<script setup lang="ts">
import type { ExportOptions } from '../composables/useCollectionExport'

interface Props {
  /** Collection name */
  collection: string

  /** Data rows to export */
  rows: any[]

  /** Available export formats */
  formats?: ('csv' | 'json')[]

  /** Export options passed to composable */
  options?: ExportOptions

  /** Button variant */
  variant?: 'solid' | 'outline' | 'ghost' | 'soft' | 'link' | 'subtle'

  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'

  /** Button color */
  color?: string

  /** Disable the button */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formats: () => ['csv', 'json'],
  variant: 'ghost',
  size: 'sm',
  disabled: false
})

const emit = defineEmits<{
  export: [format: 'csv' | 'json', rows: any[]]
  error: [error: Error]
}>()

const { tString } = useT()
const { exportCSV, exportJSON } = useCollectionExport(props.collection)

function handleExport(format: 'csv' | 'json') {
  try {
    if (format === 'csv') {
      exportCSV(props.rows, props.options)
    }
    else {
      exportJSON(props.rows, props.options)
    }
    emit('export', format, props.rows)
  }
  catch (error) {
    emit('error', error as Error)
  }
}

// Dropdown items for multi-format mode
const dropdownItems = computed(() => {
  return props.formats.map(format => ({
    label: tString(`export.${format}`),
    icon: format === 'csv'
      ? 'i-lucide-file-spreadsheet'
      : 'i-lucide-file-json',
    disabled: props.disabled || !props.rows?.length,
    onSelect: () => handleExport(format)
  }))
})

// Single format mode (no dropdown)
const isSingleFormat = computed(() => props.formats.length === 1)

function handleSingleClick() {
  if (isSingleFormat.value && props.rows?.length) {
    handleExport(props.formats[0])
  }
}
</script>

<template>
  <!-- Single format: regular button -->
  <UButton
    v-if="isSingleFormat"
    :variant="variant"
    :size="size"
    :color="color"
    :disabled="disabled || !rows?.length"
    icon="i-lucide-download"
    @click="handleSingleClick"
  >
    <slot>{{ tString('common.export') }} {{ formats[0].toUpperCase() }}</slot>
  </UButton>

  <!-- Multiple formats: dropdown -->
  <UDropdownMenu
    v-else
    :items="dropdownItems"
    :content="{ align: 'end' }"
  >
    <UButton
      :variant="variant"
      :size="size"
      :color="color"
      :disabled="disabled || !rows?.length"
      icon="i-lucide-download"
      trailing-icon="i-lucide-chevron-down"
    >
      <slot>{{ tString('common.export') }}</slot>
    </UButton>
  </UDropdownMenu>
</template>
