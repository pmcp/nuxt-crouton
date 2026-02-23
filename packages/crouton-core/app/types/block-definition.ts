/**
 * Crouton Block Definition
 *
 * Full runtime definition for an addon block registered in app.config.ts.
 * Addon packages (e.g. crouton-charts, crouton-maps) register their blocks
 * here so that crouton-pages can create TipTap extensions dynamically.
 */

export interface CroutonBlockPropertySchema {
  name: string
  type: 'text' | 'textarea' | 'select' | 'switch' | 'links' | 'features' | 'cards' | 'icon' | 'image' | 'collection' | 'faq-items' | 'chart-preset' | string
  label: string
  description?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: unknown
  visibleWhen?: (attrs: Record<string, unknown>) => boolean
}

export interface CroutonBlockTipTapAttribute {
  default: unknown
  /** parseHTML tag attribute name (e.g. 'data-height') — if set, generates parseHTML/renderHTML */
  htmlAttr?: string
  /** Parse type: 'int', 'float', 'boolean' — used when reading from HTML */
  parseType?: 'int' | 'float' | 'boolean'
}

export interface CroutonBlockDefinition {
  /** TipTap node name (e.g. 'chartBlock') — must match existing block names for backward compat */
  type: string
  /** Display name for the slash menu */
  name: string
  /** Short description for the slash menu */
  description: string
  /** Lucide icon class */
  icon: string
  /** Category for grouping in the slash menu */
  category: string
  /** Default attribute values when inserting */
  defaultAttrs: Record<string, unknown>
  /** Property panel field definitions */
  schema: CroutonBlockPropertySchema[]
  /** Whether to wrap the renderer in <ClientOnly> */
  clientOnly?: boolean
  /** Auto-imported component names */
  components: {
    /** Editor NodeView component name (e.g. 'CroutonChartsBlocksChartBlockView') */
    editorView: string
    /** Public render component name (e.g. 'CroutonChartsBlocksChartBlockRender') */
    renderer: string
  }
  /** Custom property editor components keyed by schema field type */
  propertyComponents?: Record<string, string>
  /** Declarative TipTap node configuration */
  tiptap: {
    /** Tag selector for parseHTML (e.g. 'div[data-type="chart-block"]') */
    parseHTMLTag: string
    /** Attribute definitions — converted to TipTap addAttributes() */
    attributes: Record<string, CroutonBlockTipTapAttribute>
  }
}