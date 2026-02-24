<script setup lang="ts">
/**
 * Button Row Editor
 *
 * Editor for managing button arrays in the button row block.
 * Each button can be a link (internal/external URL) or a file download.
 */
import { ref, watch } from 'vue'
import type { ButtonRowItem } from '../../../types/blocks'

interface Props {
  modelValue: ButtonRowItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: ButtonRowItem[]]
}>()

const colorOptions = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' }
]

const variantOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Outline', value: 'outline' },
  { label: 'Soft', value: 'soft' },
  { label: 'Ghost', value: 'ghost' },
  { label: 'Link', value: 'link' }
]

const buttons = ref<ButtonRowItem[]>([...props.modelValue])

watch(() => props.modelValue, (newVal) => {
  buttons.value = [...newVal]
}, { deep: true })

function emitChange() {
  emit('update:modelValue', [...buttons.value])
}

function addButton() {
  buttons.value.push({
    label: 'New Button',
    to: '',
    color: 'primary',
    variant: 'solid'
  })
  emitChange()
}

function removeButton(index: number) {
  buttons.value.splice(index, 1)
  emitChange()
}

function updateButton(index: number, field: keyof ButtonRowItem, value: any) {
  buttons.value[index] = { ...buttons.value[index], [field]: value }
  emitChange()
}

function toggleDownloadMode(index: number, isDownload: boolean) {
  const btn = { ...buttons.value[index], download: isDownload }
  if (isDownload) {
    // Switching to download mode — clear link fields
    btn.to = undefined
    btn.external = undefined
  }
  else {
    // Switching to link mode — clear file fields
    btn.file = undefined
    btn.fileName = undefined
  }
  buttons.value[index] = btn
  emitChange()
}

function moveButton(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= buttons.value.length) return

  const temp = buttons.value[index]
  buttons.value[index] = buttons.value[newIndex]
  buttons.value[newIndex] = temp
  emitChange()
}

// File upload handler (reuses same pattern as FileEditor)
const uploadingIndex = ref<number | null>(null)

async function handleFileUpload(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadingIndex.value = index
  try {
    const formData = new FormData()
    formData.append('file', file)

    const result = await globalThis.$fetch<{ pathname: string }>('/api/upload-image', {
      method: 'POST',
      body: formData
    })

    const fileUrl = `/images/${result.pathname}`
    const btn = { ...buttons.value[index], file: fileUrl, fileName: file.name }
    buttons.value[index] = btn
    emitChange()
  }
  catch (err) {
    console.error('File upload failed:', err)
  }
  finally {
    uploadingIndex.value = null
    input.value = ''
  }
}

function removeFile(index: number) {
  const btn = { ...buttons.value[index], file: undefined, fileName: undefined }
  buttons.value[index] = btn
  emitChange()
}
</script>

<template>
  <div class="button-row-editor space-y-3">
    <!-- Button Items -->
    <div
      v-for="(btn, index) in buttons"
      :key="index"
      class="p-3 border border-default rounded-lg space-y-2"
    >
      <!-- Header with move/delete -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Button {{ index + 1 }}</span>
        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-up"
            size="xs"
            :disabled="index === 0"
            @click="moveButton(index, 'up')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-down"
            size="xs"
            :disabled="index === buttons.length - 1"
            @click="moveButton(index, 'down')"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            @click="removeButton(index)"
          />
        </div>
      </div>

      <!-- Mode toggle: Link / Download -->
      <div class="flex items-center gap-2">
        <UButtonGroup size="xs" class="w-full">
          <UButton
            :color="!btn.download ? 'primary' : 'neutral'"
            :variant="!btn.download ? 'solid' : 'outline'"
            icon="i-lucide-link"
            label="Link"
            class="flex-1"
            @click="toggleDownloadMode(index, false)"
          />
          <UButton
            :color="btn.download ? 'primary' : 'neutral'"
            :variant="btn.download ? 'solid' : 'outline'"
            icon="i-lucide-download"
            label="Download"
            class="flex-1"
            @click="toggleDownloadMode(index, true)"
          />
        </UButtonGroup>
      </div>

      <!-- Label -->
      <UInput
        :model-value="btn.label"
        placeholder="Button text"
        size="sm"
        @update:model-value="updateButton(index, 'label', $event)"
      />

      <!-- Link mode: URL input -->
      <template v-if="!btn.download">
        <UInput
          :model-value="btn.to || ''"
          placeholder="/page or https://..."
          size="sm"
          @update:model-value="updateButton(index, 'to', $event)"
        >
          <template #leading>
            <UIcon name="i-lucide-link" class="size-3" />
          </template>
        </UInput>

        <div class="flex items-center gap-2">
          <USwitch
            :model-value="btn.external || false"
            size="xs"
            @update:model-value="updateButton(index, 'external', $event)"
          />
          <span class="text-xs text-neutral-500">Open in new tab</span>
        </div>
      </template>

      <!-- Download mode: File upload -->
      <template v-else>
        <!-- File preview -->
        <div v-if="btn.file" class="flex items-center gap-2 rounded-md border border-default p-2 bg-neutral-50 dark:bg-neutral-900">
          <UIcon name="i-lucide-file" class="size-4 text-primary shrink-0" />
          <span class="text-xs text-neutral-600 dark:text-neutral-400 truncate flex-1">
            {{ btn.fileName || btn.file.split('/').pop() }}
          </span>
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            size="xs"
            @click="removeFile(index)"
          />
        </div>

        <!-- Upload zone -->
        <label
          v-else
          class="flex flex-col items-center justify-center h-16 rounded-md border-2 border-dashed border-default bg-neutral-50 dark:bg-neutral-900 cursor-pointer hover:border-primary/50 transition-colors"
        >
          <UIcon
            :name="uploadingIndex === index ? 'i-lucide-loader-2' : 'i-lucide-upload'"
            :class="['size-4 text-neutral-400', { 'animate-spin': uploadingIndex === index }]"
          />
          <span class="text-[10px] text-neutral-500 mt-1">
            {{ uploadingIndex === index ? 'Uploading...' : 'Click to upload' }}
          </span>
          <input
            type="file"
            class="hidden"
            :disabled="uploadingIndex === index"
            @change="handleFileUpload($event, index)"
          >
        </label>
      </template>

      <!-- Color & Variant -->
      <div class="grid grid-cols-2 gap-2">
        <USelect
          :model-value="btn.color || 'primary'"
          :items="colorOptions"
          value-key="value"
          size="sm"
          @update:model-value="updateButton(index, 'color', $event)"
        />
        <USelect
          :model-value="btn.variant || 'solid'"
          :items="variantOptions"
          value-key="value"
          size="sm"
          @update:model-value="updateButton(index, 'variant', $event)"
        />
      </div>

      <!-- Icon (optional) -->
      <CroutonIconPicker
        :model-value="btn.icon || ''"
        size="sm"
        placeholder="Add icon"
        @update:model-value="updateButton(index, 'icon', $event)"
      />
    </div>

    <!-- Add Button -->
    <UButton
      color="neutral"
      variant="dashed"
      icon="i-lucide-plus"
      size="sm"
      block
      @click="addButton"
    >
      Add Button
    </UButton>
  </div>
</template>
