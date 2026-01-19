<script setup lang="ts">
/**
 * Links Editor
 *
 * Editor for managing button/link arrays in blocks.
 */
import type { BlockLink } from '../../../types/blocks'

interface Props {
  modelValue: BlockLink[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: BlockLink[]]
}>()

// Color options
const colorOptions = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'Neutral', value: 'neutral' },
  { label: 'Success', value: 'success' },
  { label: 'Warning', value: 'warning' },
  { label: 'Error', value: 'error' }
]

// Variant options
const variantOptions = [
  { label: 'Solid', value: 'solid' },
  { label: 'Outline', value: 'outline' },
  { label: 'Soft', value: 'soft' },
  { label: 'Ghost', value: 'ghost' },
  { label: 'Link', value: 'link' }
]

// Local copy for editing
const links = ref<BlockLink[]>([...props.modelValue])

// Sync with props
watch(() => props.modelValue, (newVal) => {
  links.value = [...newVal]
}, { deep: true })

// Emit changes
function emitChange() {
  emit('update:modelValue', [...links.value])
}

// Add a new link
function addLink() {
  links.value.push({
    label: 'New Button',
    to: '',
    color: 'primary',
    variant: 'solid'
  })
  emitChange()
}

// Remove a link
function removeLink(index: number) {
  links.value.splice(index, 1)
  emitChange()
}

// Update a link
function updateLink(index: number, field: keyof BlockLink, value: any) {
  links.value[index] = { ...links.value[index], [field]: value }
  emitChange()
}

// Move link up/down
function moveLink(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= links.value.length) return

  const temp = links.value[index]
  links.value[index] = links.value[newIndex]
  links.value[newIndex] = temp
  emitChange()
}
</script>

<template>
  <div class="links-editor space-y-3">
    <!-- Link Items -->
    <div
      v-for="(link, index) in links"
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
            @click="moveLink(index, 'up')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-down"
            size="xs"
            :disabled="index === links.length - 1"
            @click="moveLink(index, 'down')"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            @click="removeLink(index)"
          />
        </div>
      </div>

      <!-- Label -->
      <UInput
        :model-value="link.label"
        placeholder="Button text"
        size="sm"
        @update:model-value="updateLink(index, 'label', $event)"
      />

      <!-- URL -->
      <UInput
        :model-value="link.to || ''"
        placeholder="/page or https://..."
        size="sm"
        @update:model-value="updateLink(index, 'to', $event)"
      >
        <template #leading>
          <UIcon name="i-lucide-link" class="size-3" />
        </template>
      </UInput>

      <!-- Color & Variant -->
      <div class="grid grid-cols-2 gap-2">
        <USelect
          :model-value="link.color || 'primary'"
          :items="colorOptions"
          value-key="value"
          size="sm"
          @update:model-value="updateLink(index, 'color', $event)"
        />
        <USelect
          :model-value="link.variant || 'solid'"
          :items="variantOptions"
          value-key="value"
          size="sm"
          @update:model-value="updateLink(index, 'variant', $event)"
        />
      </div>

      <!-- Icon (optional) -->
      <UInput
        :model-value="link.icon || ''"
        placeholder="Icon (e.g., i-lucide-arrow-right)"
        size="sm"
        @update:model-value="updateLink(index, 'icon', $event)"
      />
    </div>

    <!-- Add Button -->
    <UButton
      color="neutral"
      variant="dashed"
      icon="i-lucide-plus"
      size="sm"
      block
      @click="addLink"
    >
      Add Button
    </UButton>
  </div>
</template>
