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
  /**
   * Sizing contract (#710) — how the block behaves in a pane. All optional; a
   * block that declares nothing is treated as fully fluid (minWidth 0). The
   * panes renderer (#706) enforces the minimums at runtime; the viability
   * metric (`checkLayoutViability`) and the deterministic layout pass (#709)
   * read them to reason about whether an arrangement is good.
   */
  /** Minimum width in px below which the block breaks — the viability floor. */
  minWidth?: number
  /** Minimum height in px. */
  minHeight?: number
  /** Maximum width in px (the block shouldn't stretch past this). */
  maxWidth?: number
  /** Preferred size (percentage of its pane group) when first placed. */
  defaultSize?: number
  /** Width/height ratio, used when `resize: 'aspect'`. */
  aspect?: number
  /** How the pane may resize the block. Default `'free'`. */
  resize?: 'free' | 'fixed' | 'aspect'
  /** Information density hint for the block's own layout. */
  density?: 'compact' | 'comfortable' | 'spacious'
}

export type CroutonLayoutBlockRegistry = Record<string, CroutonLayoutBlockDefinition>
