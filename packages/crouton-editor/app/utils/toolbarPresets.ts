import type { EditorToolbarItem } from '@nuxt/ui'

/**
 * Shared toolbar presets used by CroutonEditorSimple and CroutonEditorBlocks.
 *
 * Each preset is a single group `EditorToolbarItem[]` that can be composed
 * into a fixed toolbar (`EditorToolbarItem[][]`).
 */

export const undoRedoGroup: EditorToolbarItem[] = [
  { kind: 'undo', icon: 'i-lucide-undo', tooltip: { text: 'Undo' } },
  { kind: 'redo', icon: 'i-lucide-redo', tooltip: { text: 'Redo' } }
]

export const blockTypesGroup: EditorToolbarItem[] = [
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
]

export const marksGroup: EditorToolbarItem[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
  { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
  { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: 'Strike' } },
  { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: 'Code' } },
  { kind: 'mark', mark: 'highlight', icon: 'i-lucide-highlighter', tooltip: { text: 'Highlight' } } as EditorToolbarItem
]

export const linkGroup: EditorToolbarItem[] = [
  { kind: 'link', icon: 'i-lucide-link', tooltip: { text: 'Link' } }
]

/**
 * Bubble toolbar "Turn into" dropdown — full version (Simple.vue) with paragraph + lists.
 */
export const bubbleTurnIntoFull: EditorToolbarItem[] = [
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
]

/**
 * Bubble toolbar "Turn into" dropdown — slim version (Blocks.vue) with only paragraph + headings.
 */
export const bubbleTurnIntoSlim: EditorToolbarItem[] = [
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
]

/**
 * Bubble toolbar marks group — Blocks.vue uses a slimmer set (no strike/code).
 */
export const bubbleMarksSlim: EditorToolbarItem[] = [
  { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: 'Bold' } },
  { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: 'Italic' } },
  { kind: 'mark', mark: 'underline', icon: 'i-lucide-underline', tooltip: { text: 'Underline' } },
  { kind: 'mark', mark: 'highlight', icon: 'i-lucide-highlighter', tooltip: { text: 'Highlight' } } as EditorToolbarItem
]
