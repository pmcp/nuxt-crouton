<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  contentType?: 'html' | 'markdown' | 'json'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const content = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value)
})

const toolbarItems = [
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: 'Headings' },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: 'Heading 1' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: 'Heading 2' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: 'Heading 3' }
      ]
    }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strikethrough' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  [
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: 'Bullet List' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: 'Numbered List' } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Quote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code Block' } }
  ]
]
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="content"
    :content-type="contentType ?? 'html'"
    :placeholder="placeholder ?? 'Start writing...'"
    class="w-full min-h-48"
  >
    <UEditorToolbar
      :editor="editor"
      :items="toolbarItems"
      layout="bubble"
    />
  </UEditor>
</template>
