<script setup lang="ts">
/**
 * CroutonEditorSimple Stub
 *
 * Fallback when nuxt-crouton-editor is not installed.
 * Provides basic UEditor with toolbar.
 */
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'

interface Props {
  modelValue?: string | null
  placeholder?: string
  contentType?: 'html' | 'markdown' | 'json'
  editable?: boolean
  showToolbar?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'html',
  editable: true,
  showToolbar: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const model = computed({
  get: () => props.modelValue || '',
  set: value => emit('update:modelValue', value)
})

const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]
</script>

<template>
  <UEditor
    v-slot="{ editor }"
    v-model="model"
    :content-type="contentType"
    :placeholder="placeholder"
    :editable="editable"
    class="flex flex-col h-full"
    :ui="{
      root: 'h-full flex flex-col',
      content: 'flex-1 overflow-auto p-4'
    }"
  >
    <UEditorToolbar
      v-if="editor && showToolbar"
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-default px-2 py-1.5"
    />
  </UEditor>
</template>
