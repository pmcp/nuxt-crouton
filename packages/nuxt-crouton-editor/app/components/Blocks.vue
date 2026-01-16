<script setup lang="ts">
/**
 * CroutonEditorBlocks
 *
 * A block-based editor built on UEditor with slash command support.
 * Supports custom NodeView blocks with property panel editing.
 *
 * Usage:
 * <CroutonEditorBlocks
 *   v-model="content"
 *   :extensions="[MyBlockExtension]"
 *   :suggestion-items="blockItems"
 *   content-type="json"
 * />
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/vue-3'
import type { EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'

export interface BlockSuggestionItem {
  /** Block type name (e.g., 'heroBlock') */
  type: string
  /** Display label in menu */
  label: string
  /** Description shown in menu */
  description?: string
  /** Icon name (e.g., 'i-lucide-layout-template') */
  icon?: string
  /** Category for grouping */
  category?: string
  /** TipTap command name (e.g., 'insertHeroBlock') */
  command: string
}

interface Props {
  modelValue?: string | null
  placeholder?: string
  contentType?: 'html' | 'markdown' | 'json'
  editable?: boolean
  autofocus?: boolean | 'start' | 'end' | 'all' | number
  /** Custom TipTap extensions for blocks */
  extensions?: any[]
  /** Show the default toolbar */
  showToolbar?: boolean
  /** Show bubble toolbar on selection */
  showBubbleToolbar?: boolean
  /** Block items for slash command menu */
  suggestionItems?: BlockSuggestionItem[]
}

const props = withDefaults(defineProps<Props>(), {
  contentType: 'json',
  editable: true,
  showToolbar: true,
  showBubbleToolbar: false,
  suggestionItems: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'create': [{ editor: Editor }]
  'update': [{ editor: Editor }]
  'block:select': [{ node: any; pos: number } | null]
  'block:edit': [{ node: any; pos: number }]
}>()

// Two-way binding for editor content
const content = computed({
  get: () => props.modelValue || '',
  set: (value) => emit('update:modelValue', value)
})

// Editor instance (populated via @create event)
const editorInstance = ref<Editor | null>(null)

// State for property panel
const selectedNode = ref<{ pos: number; node: any } | null>(null)
const isPropertyPanelOpen = ref(false)

// Listen for block edit requests from NodeView components
// (They can't use provide/inject due to VueNodeViewRenderer boundary)
function handleBlockEditRequest(event: Event) {
  console.log('[CroutonEditorBlocks] Received block-edit-request event', event)
  const customEvent = event as CustomEvent<{ node: any; pos: number }>
  console.log('[CroutonEditorBlocks] Event detail:', customEvent.detail)
  selectedNode.value = { pos: customEvent.detail.pos, node: customEvent.detail.node }
  isPropertyPanelOpen.value = true
  console.log('[CroutonEditorBlocks] isPropertyPanelOpen set to:', isPropertyPanelOpen.value)
  emit('block:edit', customEvent.detail)
}

onMounted(() => {
  console.log('[CroutonEditorBlocks] Mounting, adding block-edit-request listener')
  document.addEventListener('block-edit-request', handleBlockEditRequest)
})

onUnmounted(() => {
  document.removeEventListener('block-edit-request', handleBlockEditRequest)
})

// Handle editor creation
function handleEditorCreate(event: { editor: Editor }) {
  editorInstance.value = event.editor
  emit('create', event)
}

// Track selection changes to find selected block
function handleEditorUpdate(event: { editor: Editor }) {
  const editor = event.editor
  const { from } = editor.state.selection
  const $pos = editor.state.doc.resolve(from)

  // Find the nearest block node
  for (let depth = $pos.depth; depth > 0; depth--) {
    const node = $pos.node(depth)
    if (node.type.name.endsWith('Block')) {
      const pos = $pos.before(depth)
      selectedNode.value = { pos, node }
      emit('block:select', selectedNode.value)
      emit('update', event)
      return
    }
  }

  selectedNode.value = null
  emit('block:select', null)
  emit('update', event)
}

// Open property panel for selected block
function openPropertyPanel() {
  if (selectedNode.value) {
    isPropertyPanelOpen.value = true
    emit('block:edit', selectedNode.value)
  }
}

// Close property panel
function closePropertyPanel() {
  isPropertyPanelOpen.value = false
}

// Update block attributes
function updateBlockAttrs(attrs: Record<string, unknown>) {
  if (!editorInstance.value || !selectedNode.value) return

  const { pos } = selectedNode.value
  const { tr } = editorInstance.value.state

  // Update attributes without focusing or selecting (avoids stealing focus from form inputs)
  const node = editorInstance.value.state.doc.nodeAt(pos)
  if (node) {
    editorInstance.value.view.dispatch(
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
    )
  }
}

// Delete selected block
function deleteSelectedBlock() {
  if (!editorInstance.value || !selectedNode.value) return

  const { pos } = selectedNode.value
  editorInstance.value.chain()
    .focus()
    .setNodeSelection(pos)
    .deleteSelection()
    .run()

  selectedNode.value = null
  isPropertyPanelOpen.value = false
}

// Convert block items to suggestion menu items with handlers
const suggestionMenuItems = computed<EditorSuggestionMenuItem[][]>(() => {
  if (!props.suggestionItems?.length) return []

  // Group by category
  const categories = new Map<string, BlockSuggestionItem[]>()
  for (const item of props.suggestionItems) {
    const cat = item.category || 'Blocks'
    if (!categories.has(cat)) {
      categories.set(cat, [])
    }
    categories.get(cat)!.push(item)
  }

  // Build menu structure
  const result: EditorSuggestionMenuItem[][] = []

  for (const [category, items] of categories) {
    const group: EditorSuggestionMenuItem[] = [
      { type: 'label', label: category }
    ]

    for (const item of items) {
      group.push({
        label: item.label,
        icon: item.icon,
        // Use custom kind that maps to our handler
        kind: item.command as any
      })
    }

    result.push(group)
  }

  return result
})

// Custom handlers for block insertion
// UEditor handlers must have an `execute` method that returns a TipTap chain
const blockHandlers = computed(() => {
  const handlers: Record<string, { execute: (editor: Editor) => any }> = {}

  for (const item of props.suggestionItems || []) {
    handlers[item.command] = {
      execute: (editor: Editor) => {
        // Use editor.commands directly - this returns boolean, not a chain
        // But we need to return a chain for UEditor's suggestion menu
        const command = (editor.commands as any)[item.command]
        if (command) {
          // Execute the command directly
          command()
          // Return a dummy chain that's already complete
          return { run: () => true }
        } else {
          console.warn(`[CroutonEditorBlocks] Command not found: ${item.command}`)
          return { run: () => false }
        }
      }
    }
  }

  return handlers
})

// Base toolbar items
const toolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
    { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
  ],
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
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]

// Bubble toolbar items
const bubbleToolbarItems: EditorToolbarItem[][] = [
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
        { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' }
      ]
    }
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
    { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } }
  ],
  [
    { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
  ]
]

// Expose editor instance and utilities
defineExpose({
  editor: editorInstance,
  selectedNode,
  isPropertyPanelOpen,
  openPropertyPanel,
  closePropertyPanel,
  updateBlockAttrs,
  deleteSelectedBlock
})
</script>

<template>
  <div class="crouton-editor-blocks h-full flex flex-col">
    <!-- Editor using UEditor directly for full control -->
    <UEditor
      v-slot="{ editor }"
      v-model="content"
      :content-type="contentType"
      :placeholder="placeholder"
      :editable="editable"
      :autofocus="autofocus"
      :extensions="extensions"
      :handlers="blockHandlers"
      class="flex flex-col h-full"
      :ui="{
        root: 'h-full flex flex-col',
        content: 'flex-1 overflow-auto prose prose-sm dark:prose-invert max-w-none p-4'
      }"
      @create="handleEditorCreate"
      @update="handleEditorUpdate"
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

      <!-- Slash command suggestion menu -->
      <UEditorSuggestionMenu
        v-if="editor && suggestionItems?.length"
        :editor="editor"
        :items="suggestionMenuItems"
        char="/"
      />
    </UEditor>

    <!-- Property Panel Slot -->
    <slot
      name="property-panel"
      :selected-node="selectedNode"
      :is-open="isPropertyPanelOpen"
      :close="closePropertyPanel"
      :update-attrs="updateBlockAttrs"
      :delete-block="deleteSelectedBlock"
    >
      <!-- Default: no property panel, consumer provides via slot -->
    </slot>
  </div>
</template>

<style>
/* Block selection styling */
.crouton-editor-blocks :deep(.ProseMirror-selectednode) {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
  border-radius: 0.5rem;
}

/* Block wrapper in editor */
.crouton-editor-blocks :deep(.block-wrapper) {
  position: relative;
  margin: 1rem 0;
}

.crouton-editor-blocks :deep(.block-wrapper:hover .block-actions) {
  opacity: 1;
}

.crouton-editor-blocks :deep(.block-actions) {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}
</style>
