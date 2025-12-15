<template>
  <div class="flex flex-col h-full">
    <CroutonEditorToolbar :editor="editor" class="flex-shrink-0" />
    <EditorContent :editor="editor" class="flex-1 min-h-0 overflow-auto" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color } from '@tiptap/extension-text-style'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

watch(() => props.modelValue, (newValue) => {
  if (!editor.value) return

  const currentContent = editor.value.getHTML()
  if (currentContent !== newValue) {
    editor.value.commands.setContent(newValue || '', false)
  }
})

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit,
    TextStyle,
    Color
  ],
  editorProps: {
    attributes: {
      class: '',
    },
  },
  onUpdate: ({ editor }) => {
    const content = editor.getHTML()
    emit('update:modelValue', content)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
:deep(.tiptap) {
  height: 100%;
  padding: 1rem;
  outline: none;
  color: #111827;
}

:deep(.dark .tiptap) {
  color: #f3f4f6;
}

:deep(.tiptap p.is-empty::before) {
  color: #9ca3af;
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.dark .tiptap p.is-empty::before) {
  color: #6b7280;
}

:deep(.ProseMirror) {
  height: 100%;
  outline: none;
  color: #111827;
}

:deep(.dark .ProseMirror) {
  color: #f3f4f6;
}

:deep(.ProseMirror-focused) {
  outline: none;
}
</style>
