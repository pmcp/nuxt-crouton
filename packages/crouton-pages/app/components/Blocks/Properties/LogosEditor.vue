<script setup lang="ts">
/**
 * Logos Editor
 *
 * Editor for managing logo items in logo blocks.
 * Each item can be an icon (icon name input) or an image (upload/browse/URL).
 */
import type { LogoItem, LogoItemType } from '../../../types/blocks'

interface Props {
  modelValue: LogoItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: LogoItem[]]
}>()

// Detect if crouton-assets is installed
const { hasApp } = useCroutonApps()
const hasAssetsPicker = hasApp('assets')

const items = ref<LogoItem[]>([...props.modelValue])

// Track which image items are in upload/browse/url mode
const imageMode = ref<Record<number, 'preview' | 'upload' | 'browse' | 'url'>>({})

watch(() => props.modelValue, (newVal) => {
  items.value = [...newVal]
}, { deep: true })

function emitChange() {
  emit('update:modelValue', [...items.value])
}

/** Resolve the effective type: explicit type field, or infer from value prefix */
function resolveType(item: LogoItem): LogoItemType {
  if (item.type) return item.type
  return item.value?.startsWith('i-') ? 'icon' : 'icon'
}

function addIconItem() {
  items.value.push({ type: 'icon', value: 'i-simple-icons-github' })
  emitChange()
}

function addImageItem() {
  const idx = items.value.length
  items.value.push({ type: 'image', value: '' })
  imageMode.value[idx] = hasAssetsPicker ? 'browse' : 'upload'
  emitChange()
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  delete imageMode.value[index]
  emitChange()
}

function updateItem(index: number, field: keyof LogoItem, value: string) {
  items.value[index] = { ...items.value[index], [field]: value }
  emitChange()
}

function switchItemType(index: number, newType: LogoItemType) {
  items.value[index] = {
    type: newType,
    value: '',
    alt: ''
  }
  if (newType === 'image') {
    imageMode.value[index] = hasAssetsPicker ? 'browse' : 'upload'
  }
  else {
    delete imageMode.value[index]
  }
  emitChange()
}

function moveItem(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= items.value.length) return
  const temp = items.value[index]
  items.value[index] = items.value[newIndex]
  items.value[newIndex] = temp
  emitChange()
}

function isIcon(item: LogoItem): boolean {
  return resolveType(item) === 'icon'
}

// Image handling (mirrors ImageEditor.vue patterns)
function handleFileSelected(index: number, file: File | null) {
  if (!file) return
  const formData = new FormData()
  formData.append('file', file)

  $fetch<{ pathname: string }>('/api/upload-image', {
    method: 'POST',
    body: formData
  }).then((result) => {
    const imageUrl = `/images/${result.pathname}`
    items.value[index] = { ...items.value[index], value: imageUrl }
    imageMode.value[index] = 'preview'
    emitChange()
  }).catch((err) => {
    console.error('Image upload failed:', err)
  })
}

function handleAssetSelected(index: number, asset: Record<string, any>) {
  const url = `/images/${asset.pathname}`
  items.value[index] = {
    ...items.value[index],
    value: url,
    alt: asset.alt || items.value[index].alt || ''
  }
  imageMode.value[index] = 'preview'
  emitChange()
}

function applyUrl(index: number, url: string) {
  items.value[index] = { ...items.value[index], value: url }
  imageMode.value[index] = 'preview'
  emitChange()
}

function removeImage(index: number) {
  items.value[index] = { ...items.value[index], value: '' }
  imageMode.value[index] = hasAssetsPicker ? 'browse' : 'upload'
  emitChange()
}

function getImageMode(index: number): string {
  if (imageMode.value[index]) return imageMode.value[index]
  return items.value[index]?.value ? 'preview' : (hasAssetsPicker ? 'browse' : 'upload')
}
</script>

<template>
  <div class="logos-editor space-y-2">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="p-2 border border-default rounded-lg space-y-2"
    >
      <!-- Item Header: type toggle + actions -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <!-- Type toggle buttons -->
          <UButtonGroup size="xs">
            <UButton
              :color="isIcon(item) ? 'primary' : 'neutral'"
              :variant="isIcon(item) ? 'solid' : 'ghost'"
              icon="i-lucide-at-sign"
              label="Icon"
              @click="isIcon(item) ? undefined : switchItemType(index, 'icon')"
            />
            <UButton
              :color="!isIcon(item) ? 'primary' : 'neutral'"
              :variant="!isIcon(item) ? 'solid' : 'ghost'"
              icon="i-lucide-image"
              label="Image"
              @click="!isIcon(item) ? undefined : switchItemType(index, 'image')"
            />
          </UButtonGroup>
        </div>

        <!-- Reorder + delete -->
        <div class="flex items-center gap-0.5">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-up"
            size="xs"
            :disabled="index === 0"
            @click="moveItem(index, 'up')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-down"
            size="xs"
            :disabled="index === items.length - 1"
            @click="moveItem(index, 'down')"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            @click="removeItem(index)"
          />
        </div>
      </div>

      <!-- Icon mode: icon name input with preview -->
      <div v-if="isIcon(item)" class="flex items-center gap-2">
        <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted/50">
          <UIcon
            v-if="item.value"
            :name="item.value"
            class="size-5 text-muted"
          />
          <UIcon v-else name="i-lucide-at-sign" class="size-4 text-muted" />
        </div>
        <UInput
          :model-value="item.value"
          placeholder="i-simple-icons-github"
          size="sm"
          class="flex-1"
          @update:model-value="updateItem(index, 'value', $event)"
        />
      </div>

      <!-- Image mode: upload / browse / URL with preview -->
      <div v-else class="space-y-2">
        <!-- Image Preview -->
        <div v-if="item.value && getImageMode(index) === 'preview'" class="space-y-2">
          <div class="relative rounded-lg overflow-hidden border border-default">
            <img
              :src="item.value"
              :alt="item.alt || ''"
              class="w-full max-h-24 object-contain bg-muted/20"
            >
            <div class="absolute top-1 right-1 flex gap-1">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="solid"
                size="xs"
                @click="imageMode[index] = 'url'"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="solid"
                size="xs"
                @click="removeImage(index)"
              />
            </div>
          </div>
          <UInput
            :model-value="item.alt || ''"
            placeholder="Alt text"
            size="xs"
            @update:model-value="updateItem(index, 'alt', $event)"
          />
        </div>

        <!-- No Image: action buttons -->
        <div v-if="!item.value && getImageMode(index) === 'preview'" class="flex flex-col gap-2">
          <div class="flex items-center justify-center h-16 rounded-lg border-2 border-dashed border-default bg-neutral-50 dark:bg-neutral-900">
            <div class="text-center">
              <UIcon name="i-lucide-image" class="size-5 text-neutral-400" />
              <p class="text-xs text-neutral-500">No image</p>
            </div>
          </div>
          <div class="flex gap-1">
            <UButton
              v-if="hasAssetsPicker"
              icon="i-lucide-folder-open"
              label="Browse"
              variant="soft"
              color="neutral"
              size="xs"
              class="flex-1"
              @click="imageMode[index] = 'browse'"
            />
            <UButton
              icon="i-lucide-upload"
              label="Upload"
              variant="soft"
              color="neutral"
              size="xs"
              class="flex-1"
              @click="imageMode[index] = 'upload'"
            />
            <UButton
              icon="i-lucide-link"
              label="URL"
              variant="soft"
              color="neutral"
              size="xs"
              class="flex-1"
              @click="imageMode[index] = 'url'"
            />
          </div>
        </div>

        <!-- Browse Library -->
        <div v-if="getImageMode(index) === 'browse' && hasAssetsPicker" class="space-y-2">
          <Suspense>
            <CroutonAssetsPicker @select="handleAssetSelected(index, $event)" />
            <template #fallback>
              <div class="h-16 flex items-center justify-center text-xs text-muted">Loading library...</div>
            </template>
          </Suspense>
          <div class="flex gap-1">
            <UButton icon="i-lucide-upload" label="Upload" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'upload'" />
            <UButton icon="i-lucide-link" label="URL" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'url'" />
            <UButton v-if="item.value" label="Cancel" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'preview'" />
          </div>
        </div>

        <!-- Upload -->
        <div v-if="getImageMode(index) === 'upload'" class="space-y-2">
          <CroutonImageUpload @file-selected="handleFileSelected(index, $event)" />
          <div class="flex gap-1">
            <UButton v-if="hasAssetsPicker" icon="i-lucide-folder-open" label="Browse" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'browse'" />
            <UButton icon="i-lucide-link" label="URL" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'url'" />
            <UButton v-if="item.value" label="Cancel" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'preview'" />
          </div>
        </div>

        <!-- URL Input -->
        <div v-if="getImageMode(index) === 'url'" class="space-y-2">
          <UInput
            :model-value="item.value"
            placeholder="https://example.com/logo.png"
            size="sm"
            @update:model-value="updateItem(index, 'value', $event)"
          >
            <template #leading>
              <UIcon name="i-lucide-link" class="size-4" />
            </template>
          </UInput>
          <div class="flex gap-1">
            <UButton label="Apply" color="primary" size="xs" @click="applyUrl(index, item.value)" />
            <UButton v-if="hasAssetsPicker" icon="i-lucide-folder-open" label="Browse" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'browse'" />
            <UButton icon="i-lucide-upload" label="Upload" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'upload'" />
            <UButton v-if="item.value" label="Cancel" variant="ghost" color="neutral" size="xs" @click="imageMode[index] = 'preview'" />
          </div>
        </div>
      </div>
    </div>

    <!-- Add buttons -->
    <div class="flex gap-2">
      <UButton
        color="neutral"
        variant="dashed"
        icon="i-lucide-at-sign"
        size="sm"
        class="flex-1"
        @click="addIconItem"
      >
        Add Icon
      </UButton>
      <UButton
        color="neutral"
        variant="dashed"
        icon="i-lucide-image"
        size="sm"
        class="flex-1"
        @click="addImageItem"
      >
        Add Image
      </UButton>
    </div>
  </div>
</template>