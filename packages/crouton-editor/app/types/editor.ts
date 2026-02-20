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
