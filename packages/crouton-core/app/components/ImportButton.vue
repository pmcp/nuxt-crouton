<script setup lang="ts">
import type { ImportResult } from '../composables/useCollectionImport'

interface Props {
  /** Collection name */
  collection: string

  /** Available import formats */
  formats?: ('csv' | 'json')[]

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
  'import-complete': [result: ImportResult]
}>()

const { tString } = useT()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const showModal = ref(false)
const selectedFormat = ref<'csv' | 'json'>('csv')

const acceptedExtensions = computed(() =>
  props.formats.map(f => `.${f}`).join(',')
)

function triggerFileSelect(format?: 'csv' | 'json') {
  if (format) {
    selectedFormat.value = format
  }
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    showModal.value = true
  }
  // Reset input so same file can be selected again
  target.value = ''
}

function handleImportComplete(result: ImportResult) {
  emit('import-complete', result)
}

// Dropdown items for multi-format mode
const dropdownItems = computed(() => {
  return props.formats.map(format => ({
    label: tString(`import.${format}`) || `Import ${format.toUpperCase()}`,
    icon: format === 'csv'
      ? 'i-lucide-file-spreadsheet'
      : 'i-lucide-file-json',
    disabled: props.disabled,
    onSelect: () => triggerFileSelect(format)
  }))
})

const isSingleFormat = computed(() => props.formats.length === 1)
</script>

<template>
  <!-- Hidden file input -->
  <input
    ref="fileInput"
    type="file"
    :accept="acceptedExtensions"
    class="hidden"
    @change="handleFileChange"
  >

  <!-- Single format: regular button -->
  <UButton
    v-if="isSingleFormat"
    :variant="variant"
    :size="size"
    :color="color"
    :disabled="disabled"
    icon="i-lucide-upload"
    @click="triggerFileSelect(formats[0])"
  >
    <slot>{{ tString('common.import') || 'Import' }} {{ formats[0].toUpperCase() }}</slot>
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
      :disabled="disabled"
      icon="i-lucide-upload"
      trailing-icon="i-lucide-chevron-down"
    >
      <slot>{{ tString('common.import') || 'Import' }}</slot>
    </UButton>
  </UDropdownMenu>

  <!-- Import preview modal -->
  <CroutonImportPreviewModal
    v-model:open="showModal"
    :collection="collection"
    :file="selectedFile"
    @import-complete="handleImportComplete"
    @close="showModal = false"
  />
</template>
