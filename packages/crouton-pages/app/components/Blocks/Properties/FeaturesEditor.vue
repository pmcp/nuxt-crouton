<script setup lang="ts">
/**
 * Features Editor
 *
 * Editor for managing feature items in section blocks.
 */
import type { BlockFeature } from '../../../types/blocks'

interface Props {
  modelValue: BlockFeature[]
}

const props = defineProps<Props>()

const { t } = useT()

const emit = defineEmits<{
  'update:modelValue': [value: BlockFeature[]]
}>()

// Local copy for editing
const features = ref<BlockFeature[]>([...props.modelValue])

// Sync with props
watch(() => props.modelValue, (newVal) => {
  features.value = [...newVal]
}, { deep: true })

// Emit changes
function emitChange() {
  emit('update:modelValue', [...features.value])
}

// Add a new feature
function addFeature() {
  features.value.push({
    title: 'New Feature',
    description: '',
    icon: 'i-lucide-star'
  })
  emitChange()
}

// Remove a feature
function removeFeature(index: number) {
  features.value.splice(index, 1)
  emitChange()
}

// Update a feature
function updateFeature(index: number, field: keyof BlockFeature, value: any) {
  features.value[index] = { ...features.value[index], [field]: value } as BlockFeature
  emitChange()
}

// Move feature up/down
function moveFeature(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= features.value.length) return

  const temp = features.value[index]!
  features.value[index] = features.value[newIndex]!
  features.value[newIndex] = temp
  emitChange()
}
</script>

<template>
  <div class="features-editor space-y-3">
    <!-- Feature Items -->
    <div
      v-for="(feature, index) in features"
      :key="index"
      class="p-3 border border-default rounded-lg space-y-2"
    >
      <!-- Header with move/delete -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">{{ t('pages.blocks.features.featureN', { n: index + 1 } as any) }}</span>
        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-up"
            size="xs"
            :disabled="index === 0"
            @click="moveFeature(index, 'up')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-down"
            size="xs"
            :disabled="index === features.length - 1"
            @click="moveFeature(index, 'down')"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            @click="removeFeature(index)"
          />
        </div>
      </div>

      <!-- Icon -->
      <CroutonIconPicker
        :model-value="feature.icon || ''"
        size="sm"
        @update:model-value="updateFeature(index, 'icon', $event)"
      />

      <!-- Title -->
      <UInput
        :model-value="feature.title"
        :placeholder="t('pages.blocks.features.titlePlaceholder')"
        size="sm"
        @update:model-value="updateFeature(index, 'title', $event)"
      />

      <!-- Description -->
      <UTextarea
        :model-value="feature.description || ''"
        :placeholder="t('pages.blocks.features.descriptionPlaceholder')"
        :rows="2"
        size="sm"
        @update:model-value="updateFeature(index, 'description', $event)"
      />
    </div>

    <!-- Add Button -->
    <UButton
      color="neutral"
      variant="outline"
      icon="i-lucide-plus"
      size="sm"
      block
      @click="addFeature"
    >
      {{ t('pages.blocks.features.addFeature') }}
    </UButton>
  </div>
</template>
