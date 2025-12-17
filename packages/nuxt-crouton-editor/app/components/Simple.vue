<template>
  <UEditor
    v-model="model"
    :content-type="contentType"
    :placeholder="placeholder"
    :starter-kit="starterKit"
    :extensions="extensions"
    :editable="editable"
    :autofocus="autofocus"
    :markdown="markdown"
    :image="image"
    :mention="mention"
    :handlers="handlers"
    :ui="mergedUi"
    @create="$emit('create', $event)"
    @update="$emit('update', $event)"
    @focus="$emit('focus', $event)"
    @blur="$emit('blur', $event)"
  >
    <template #default="{ editor, handlers: editorHandlers }">
      <slot :editor="editor" :handlers="editorHandlers" />
    </template>
  </UEditor>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Editor } from '@tiptap/vue-3'

type EditorContentType = 'html' | 'markdown' | 'json'

interface Props {
  modelValue?: string | null
  placeholder?: string
  contentType?: EditorContentType
  starterKit?: Record<string, any>
  extensions?: any[]
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  markdown?: Record<string, any>
  image?: Record<string, any>
  mention?: Record<string, any>
  handlers?: Record<string, any>
  ui?: {
    root?: string
    content?: string
    base?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'html',
  editable: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create': [{ editor: Editor }]
  'update': [{ editor: Editor }]
  'focus': [{ editor: Editor }]
  'blur': [{ editor: Editor }]
}>()

const model = computed({
  get: () => props.modelValue || '',
  set: (value) => emit('update:modelValue', value)
})

const mergedUi = computed(() => ({
  root: 'h-full',
  content: 'h-full',
  ...props.ui
}))
</script>
