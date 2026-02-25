<script setup lang="ts">
/**
 * FAQ Items Editor
 *
 * Editor for managing question/answer pairs in FAQ blocks.
 */
import type { FaqItem } from '../../../types/blocks'

interface Props {
  modelValue: FaqItem[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: FaqItem[]]
}>()

const { t } = useT()
const items = ref<FaqItem[]>([...props.modelValue])

watch(() => props.modelValue, (newVal) => {
  items.value = [...newVal]
}, { deep: true })

function emitChange() {
  emit('update:modelValue', [...items.value])
}

function addItem() {
  items.value.push({ question: 'New question', answer: '' })
  emitChange()
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  emitChange()
}

function updateItem(index: number, field: keyof FaqItem, value: string) {
  items.value[index] = { ...items.value[index], [field]: value }
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
</script>

<template>
  <div class="faq-items-editor space-y-3">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="p-3 border border-default rounded-lg space-y-2"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-muted">Q{{ index + 1 }}</span>
        <div class="flex items-center gap-1">
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

      <UInput
        :model-value="item.question"
        :placeholder="t('pages.blocks.faq.questionPlaceholder')"
        size="sm"
        @update:model-value="updateItem(index, 'question', $event)"
      />

      <UTextarea
        :model-value="item.answer"
        :placeholder="t('pages.blocks.faq.answerPlaceholder')"
        :rows="2"
        size="sm"
        @update:model-value="updateItem(index, 'answer', $event)"
      />
    </div>

    <UButton
      color="neutral"
      variant="dashed"
      icon="i-lucide-plus"
      size="sm"
      block
      @click="addItem"
    >
      {{ t('pages.blocks.faq.addQuestion') }}
    </UButton>
  </div>
</template>
