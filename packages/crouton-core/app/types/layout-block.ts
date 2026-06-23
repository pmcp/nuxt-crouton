/**
 * Layout block registry types (Sprint 1, #704).
 *
 * A "layout block" is a component a package declares as *placeable* into a pane
 * layout. It mirrors `CroutonPageType`'s required trio (name/description/icon)
 * and, like page types and the TipTap content-block registry, carries the
 * component as an auto-imported NAME (string) resolved via `<component :is>` —
 * never a component object, never `resolveComponent()`.
 *
 * NB: distinct from `croutonBlocks` / `CroutonBlockDefinition` (the TipTap
 * rich-text content-block registry). Layout blocks are pane-placeable surfaces,
 * not editor nodes — hence a separate `croutonLayoutBlocks` registry.
 */

export interface CroutonLayoutBlockConfigField {
  /** Prop name passed to the block component. */
  name: string
  type: 'text' | 'number' | 'boolean' | 'select'
  /** Display label (i18n key or plain string). */
  label?: string
  required?: boolean
  /** Applied when the persisted value is missing or fails the type check. */
  default?: unknown
  /** Options for `select`. */
  options?: Array<{ label: string, value: string }>
}

export interface CroutonLayoutBlockDefinition {
  id: string
  /** Display name — i18n key or plain string (mirror CroutonPageType). */
  name: string
  description: string
  /** Lucide icon, e.g. `i-lucide-list`. */
  icon: string
  /** Auto-imported component NAME for `<component :is>` (string, never an object). */
  component: string
  /** `compound` is parked (#708); blocks are atomic by default. */
  kind?: 'atomic' | 'compound'
  /** Grouping hint for the palette. */
  category?: string
  /** Default props merged under the user's config. */
  defaultConfig?: Record<string, unknown>
  /** User-editable props; the renderer passes ONLY these (validated) through. */
  configSchema?: CroutonLayoutBlockConfigField[]
}

export type CroutonLayoutBlockRegistry = Record<string, CroutonLayoutBlockDefinition>
