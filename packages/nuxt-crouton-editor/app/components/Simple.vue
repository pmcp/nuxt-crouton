<script setup lang="ts">
/**
 * CroutonEditorSimple
 *
 * A simple rich text editor following the Nuxt UI Editor pattern.
 * Uses UEditor + UEditorToolbar with sensible defaults.
 *
 * Based on: https://github.com/nuxt-ui-templates/editor
 */
import type { EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'

interface Props {
  modelValue?: string | null
  placeholder?: string
  contentType?: 'html' | 'markdown' | 'json'
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  showToolbar?: boolean
  showBubbleToolbar?: boolean
  extensions?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'html',
  editable: true,
  showToolbar: true,
  showBubbleToolbar: true
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create': [{ editor: Editor }]
  'update': [{ editor: Editor }]
}>()

const model = computed({
  get: () => props.modelValue || '',
  set: value => emit('update:modelValue', value)
})

// Fixed toolbar items (always visible at top)
const toolbarItems: EditorToolbarItem[][] = [
  // Undo/Redo
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
  ],
  // Block types
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
    },
    {
      icon: 'i-lucide-list',
      tooltip: { text: 'Lists' },
      content: { align: 'start' },
      items: [
        { kind: 'bulletList', icon: 'i-lucide-list', label: 'Bullet List' },
        { kind: 'orderedList', icon: 'i-lucide-list-ordered', label: 'Ordered List' }
      ]
    },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: 'Quote' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: 'Code' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: 'Divider' } }
  ],
  // Text formatting
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  // Link
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]

// Bubble toolbar items (appears on text selection)
const bubbleToolbarItems: EditorToolbarItem[][] = [
  // Turn into dropdown
  [
    {
      label: 'Turn into',
      trailingIcon: 'i-lucide-chevron-down',
      activeColor: 'neutral',
      activeVariant: 'ghost',
      content: { align: 'start' },
      ui: { label: 'text-xs' },
      items: [
        { type: 'label', label: 'Turn into' },
        { kind: 'paragraph', label: 'Paragraph', icon: 'i-lucide-type' },
        { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
        { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
        { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
        { kind: 'bulletList', label: 'Bullet List', icon: 'i-lucide-list' },
        { kind: 'orderedList', label: 'Ordered List', icon: 'i-lucide-list-ordered' },
        { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
        { kind: 'codeBlock', label: 'Code', icon: 'i-lucide-square-code' }
      ]
    }
  ],
  // Text formatting
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  // Link
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
    :autofocus="autofocus"
    :extensions="extensions"
    class="flex flex-col h-full"
    :ui="{
      root: 'h-full flex flex-col',
      content: 'flex-1 overflow-auto prose prose-sm dark:prose-invert max-w-none p-4'
    }"
    @create="$emit('create', $event)"
    @update="$emit('update', $event)"
  >
    <!-- Fixed toolbar at top -->
    <UEditorToolbar
      v-if="editor && showToolbar"
      :editor="editor"
      :items="toolbarItems"
      class="border-b border-default px-2 py-1.5 flex-shrink-0"
    />

    <!-- Bubble toolbar on text selection -->
    <UEditorToolbar
      v-if="editor && showBubbleToolbar"
      :editor="editor"
      :items="bubbleToolbarItems"
      layout="bubble"
      :should-show="({ view, state }: any) => {
        const { selection } = state
        return view.hasFocus() && !selection.empty
      }"
    />
  </UEditor>
</template>
