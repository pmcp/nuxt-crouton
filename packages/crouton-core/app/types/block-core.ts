/**
 * Shared block core (#716) — the surface-agnostic view of a block.
 *
 * Two block registries exist on purpose, because their *registration* metadata
 * genuinely differs:
 *  - `croutonBlocks` / `CroutonBlockDefinition` — TipTap **content** nodes
 *    (hero, section, map). Carry an `editorView` NodeView + `tiptap`
 *    serialization — document-only concerns.
 *  - `croutonLayoutBlocks` / `CroutonLayoutBlockDefinition` — pane **surfaces**
 *    (list, form, calendar). Carry pane config, not a document contract.
 *
 * What they SHARE is the universal core below: identity (id/name/description/
 * icon/category), the public render component NAME, and a hydration flag. This
 * type is the normalized shape both registries project onto so every renderer
 * (pages document flow, panes, later flow) can ask **one** place — see
 * `useCroutonBlockCatalog()`. Registration stays typed per surface; this is a
 * read-side projection, deliberately NOT a base both definitions `extends`
 * (that would force the working TipTap registry to rename `type` →`id` /
 * `components.renderer` → `renderer` for no consumer gain). #716.
 */

/** Which registry / rendering surface a block came from. */
export type CroutonBlockSurface = 'document' | 'pane'

/** The universal, surface-agnostic projection of a registered block. */
export interface CroutonBlockCore {
  /**
   * Stable identifier — the TipTap node name for document blocks (`def.type`),
   * the block id for pane blocks (`def.id`).
   */
  id: string
  /** Display name — i18n key or plain string. */
  name: string
  /** Short description — i18n key or plain string. */
  description: string
  /** Lucide icon class (e.g. `i-lucide-list`). */
  icon: string
  /** Grouping hint for a palette. */
  category?: string
  /** Auto-imported component NAME that renders the block publicly (never an object). */
  renderer: string
  /** Whether the public renderer must be wrapped in `<ClientOnly>`. */
  clientOnly?: boolean
  /** Which registry/surface produced this projection. */
  surface: CroutonBlockSurface
}
