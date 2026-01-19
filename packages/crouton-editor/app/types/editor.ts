/**
 * Editor variable types for template systems
 *
 * Used with CroutonEditorVariables and CroutonEditorWithPreview
 * to provide variable insertion and live preview functionality.
 */

/**
 * A single variable that can be inserted into editor content
 */
export interface EditorVariable {
  /** Variable name without braces: "customer_name" */
  name: string
  /** Display label: "Customer Name" */
  label: string
  /** Help text shown in variable menu */
  description?: string
  /** Lucide icon name: "i-lucide-user" */
  icon?: string
  /** Category for grouping: "customer", "booking", "location" */
  category?: string
  /** Sample value for preview: "John Doe" */
  sample?: string
}

/**
 * A group of variables with a label
 */
export interface EditorVariableGroup {
  /** Group label: "Customer Information" */
  label: string
  /** Variables in this group */
  variables: EditorVariable[]
}

/**
 * Props for the Variables component
 */
export interface EditorVariablesProps {
  /** TipTap editor instance */
  editor?: any
  /** Variables to show in the menu */
  variables?: EditorVariable[]
  /** Grouped variables (alternative to flat list) */
  groups?: EditorVariableGroup[]
  /** Trigger character (default: "{{") */
  char?: string
}

/**
 * Props for the WithPreview component
 */
export interface EditorWithPreviewProps {
  /** Content (v-model) */
  modelValue?: string | null
  /** Variables for insertion menu */
  variables?: EditorVariable[]
  /** Values for preview interpolation (overrides sample values) */
  previewValues?: Record<string, string>
  /** Title for preview panel */
  previewTitle?: string
  /** Content type: html, markdown, json */
  contentType?: 'html' | 'markdown' | 'json'
  /** Placeholder text */
  placeholder?: string
  /** Enable/disable editing */
  editable?: boolean
  /** Show toolbar */
  showToolbar?: boolean
  /** Additional TipTap extensions */
  extensions?: any[]
}

/**
 * Item format for UEditorMentionMenu
 */
export interface EditorMentionItem {
  label: string
  description?: string
  icon?: string
  disabled?: boolean
}
