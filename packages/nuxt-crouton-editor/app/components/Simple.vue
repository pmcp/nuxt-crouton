<template>
  <div class="flex flex-col h-full">
    <EditorToolbar :editor="editor" class="flex-shrink-0" />
<!--    <floating-menu :editor="editor" :tippy-options="{ duration: 100 }" v-if="editor">-->
<!--      <div class="editor-floating-menu">-->
<!--        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }">-->
<!--          H1-->
<!--        </button>-->
<!--        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }">-->
<!--          H2-->
<!--        </button>-->
<!--        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }">-->
<!--          Bullet list-->
<!--        </button>-->
<!--      </div>-->
<!--    </floating-menu>-->
    <TiptapEditorContent :editor="editor" class="flex-1 min-h-0 overflow-auto"/>
  </div>
</template>

<script setup>
import { FloatingMenu } from '@tiptap/vue-3'



const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  }
});

const emits = defineEmits(['update:modelValue'])

watchEffect(() => props.modelValue, (newValue, oldValue) => {
  const isSame = newValue === oldValue;
  if (isSame) {
    return;
  }

  editor.value?.commands.setContent(newValue, false)
});





const editor = useEditor({
  content: props.modelValue,
  extensions: [
    TiptapStarterKit,
    TiptapTextStyle,
    TiptapColor
  ],
  editorProps: {
    attributes: {
      class: '',
    },
  },
  onUpdate: ({ editor }) => {
    let content = editor.getHTML()
    emits('update:modelValue', content)
  }
});




onBeforeUnmount(() => {
  unref(editor).destroy();
});


</script>

<style scoped>
:deep(.tiptap) {
  height: 100%;
  padding: 1rem;
  outline: none;
  color: #111827; /* text-gray-900 */
}

:deep(.dark .tiptap) {
  color: #f3f4f6; /* text-gray-100 */
}

:deep(.tiptap p.is-empty::before) {
  color: #9ca3af; /* text-gray-400 */
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.dark .tiptap p.is-empty::before) {
  color: #6b7280; /* text-gray-500 */
}

:deep(.ProseMirror) {
  height: 100%;
  outline: none;
  color: #111827;
}

:deep(.dark .ProseMirror) {
  color: #f3f4f6; /* text-gray-100 */
}

:deep(.ProseMirror-focused) {
  outline: none;
}

/* Floating menu - scoped to editor component */
:deep(.editor-floating-menu) {
  display: flex;
  padding: 0.1rem;
  border-radius: 0.5rem;
  background-color: white;
  border: 1px solid #e5e7eb;
}

:deep(.dark .editor-floating-menu) {
  background-color: #111827; /* bg-gray-900 */
  border-color: #374151; /* border-gray-700 */
}

:deep(.editor-floating-menu button) {
  background-color: unset;
  padding: 0.275rem 0.425rem;
  border-radius: 0.3rem;
  color: #374151; /* text-gray-700 */
}

:deep(.dark .editor-floating-menu button) {
  color: #d1d5db; /* text-gray-300 */
}

:deep(.editor-floating-menu button:hover) {
  background-color: #f3f4f6; /* bg-gray-100 */
}

:deep(.dark .editor-floating-menu button:hover) {
  background-color: #1f2937; /* bg-gray-800 */
}

:deep(.editor-floating-menu button.is-active) {
  background-color: #3b82f6; /* bg-primary-500 */
  color: white;
}

:deep(.dark .editor-floating-menu button.is-active) {
  background-color: #2563eb; /* bg-primary-600 */
}

:deep(.editor-floating-menu button.is-active:hover) {
  background-color: #2563eb; /* bg-primary-600 */
}

:deep(.dark .editor-floating-menu button.is-active:hover) {
  background-color: #1d4ed8; /* bg-primary-700 */
}
</style>
