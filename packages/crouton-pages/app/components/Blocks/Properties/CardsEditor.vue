<script setup lang="ts">
/**
 * Cards Editor
 *
 * Editor for managing card items in card grid blocks.
 */
import type { BlockCard } from '../../../types/blocks'

interface Props {
  modelValue: BlockCard[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: BlockCard[]]
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

// Local copy for editing
const cards = ref<BlockCard[]>([...props.modelValue])

// Sync with props
watch(() => props.modelValue, (newVal) => {
  cards.value = [...newVal]
}, { deep: true })

// Emit changes
function emitChange() {
  emit('update:modelValue', [...cards.value])
}

// Add a new card
function addCard() {
  cards.value.push({
    title: 'New Card',
    description: '',
    icon: 'i-lucide-box'
  })
  emitChange()
}

// Remove a card
function removeCard(index: number) {
  cards.value.splice(index, 1)
  emitChange()
}

// Update a card
function updateCard(index: number, field: keyof BlockCard, value: any) {
  cards.value[index] = { ...cards.value[index], [field]: value }
  emitChange()
}

// Move card up/down
function moveCard(index: number, direction: 'up' | 'down') {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= cards.value.length) return

  const temp = cards.value[index]
  cards.value[index] = cards.value[newIndex]
  cards.value[newIndex] = temp
  emitChange()
}
</script>

<template>
  <div class="cards-editor space-y-3">
    <!-- Card Items -->
    <div
      v-for="(card, index) in cards"
      :key="index"
      class="p-3 border border-default rounded-lg space-y-2"
    >
      <!-- Header with move/delete -->
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium">Card {{ index + 1 }}</span>
        <div class="flex items-center gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-up"
            size="xs"
            :disabled="index === 0"
            @click="moveCard(index, 'up')"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-chevron-down"
            size="xs"
            :disabled="index === cards.length - 1"
            @click="moveCard(index, 'down')"
          />
          <UButton
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="xs"
            @click="removeCard(index)"
          />
        </div>
      </div>

      <!-- Icon -->
      <UInput
        :model-value="card.icon || ''"
        placeholder="Icon (e.g., i-lucide-box)"
        size="sm"
        @update:model-value="updateCard(index, 'icon', $event)"
      >
        <template #leading>
          <UIcon
            v-if="card.icon"
            :name="card.icon"
            class="size-3"
          />
        </template>
      </UInput>

      <!-- Title -->
      <UInput
        :model-value="card.title"
        placeholder="Card title"
        size="sm"
        @update:model-value="updateCard(index, 'title', $event)"
      />

      <!-- Description -->
      <UTextarea
        :model-value="card.description || ''"
        placeholder="Card description"
        :rows="2"
        size="sm"
        @update:model-value="updateCard(index, 'description', $event)"
      />

      <!-- Link URL -->
      <UInput
        :model-value="card.to || ''"
        placeholder="Link URL (optional)"
        size="sm"
        @update:model-value="updateCard(index, 'to', $event)"
      >
        <template #leading>
          <UIcon name="i-lucide-link" class="size-3" />
        </template>
      </UInput>

      <!-- Highlight -->
      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">Highlight</span>
        <div class="flex items-center gap-2">
          <USwitch
            :model-value="card.highlight || false"
            size="sm"
            @update:model-value="updateCard(index, 'highlight', $event)"
          />
          <USelect
            v-if="card.highlight"
            :model-value="card.highlightColor || 'primary'"
            :items="colorOptions"
            value-key="value"
            size="sm"
            class="w-28"
            @update:model-value="updateCard(index, 'highlightColor', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Add Button -->
    <UButton
      color="neutral"
      variant="dashed"
      icon="i-lucide-plus"
      size="sm"
      block
      @click="addCard"
    >
      Add Card
    </UButton>
  </div>
</template>
