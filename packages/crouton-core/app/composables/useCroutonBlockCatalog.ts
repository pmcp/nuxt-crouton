import { computed } from 'vue'
import type { CroutonBlockDefinition } from '../types/block-definition'
import type { CroutonLayoutBlockDefinition, CroutonLayoutBlockRegistry } from '../types/layout-block'
import type { CroutonBlockCore } from '../types/block-core'

/**
 * Unified block catalog (#716) — one read facade over BOTH block registries.
 *
 * `useCroutonBlocks()` reads the TipTap content registry (`croutonBlocks`);
 * `useCroutonLayoutBlocks()` reads the pane registry (`croutonLayoutBlocks`).
 * This composable projects both onto the shared `CroutonBlockCore` shape and
 * answers `getBlock(id)` / `listBlocks(surface?)` from a single place, so a
 * renderer (pages document flow, panes, later flow) or the deterministic layout
 * pass never has to know which registry a block lives in.
 *
 * It does NOT replace the typed registries — registration stays per surface,
 * with each surface keeping its own adapter metadata (TipTap NodeView/
 * serialization for document blocks; pane config for layout blocks). This is a
 * read-side projection only.
 *
 * The pure adapters/resolvers below are exported separately so they can be unit
 * tested without a Nuxt runtime (mirrors `useCroutonLayoutBlocks`).
 */

/** Project a TipTap content-block definition onto the shared core. */
export function documentBlockToCore(def: CroutonBlockDefinition): CroutonBlockCore {
  return {
    id: def.type,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    renderer: def.components.renderer,
    clientOnly: def.clientOnly,
    surface: 'document',
  }
}

/** Project a pane/layout-block definition onto the shared core. */
export function layoutBlockToCore(def: CroutonLayoutBlockDefinition): CroutonBlockCore {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    renderer: def.component,
    surface: 'pane',
  }
}

/**
 * Merge both registries into one id → core map.
 *
 * Pane blocks are layered LAST so that, in the (rare) event a document block and
 * a pane block share an id, the pane projection wins — a deliberate, documented
 * precedence rather than a silent collision. Both inputs are plain registry
 * objects, so this is pure and unit-testable.
 */
export function buildBlockCatalog(
  documentBlocks: Record<string, CroutonBlockDefinition>,
  layoutBlocks: CroutonLayoutBlockRegistry,
): Record<string, CroutonBlockCore> {
  const out: Record<string, CroutonBlockCore> = {}
  for (const def of Object.values(documentBlocks)) out[def.type] = documentBlockToCore(def)
  for (const def of Object.values(layoutBlocks)) out[def.id] = layoutBlockToCore(def)
  return out
}

export function useCroutonBlockCatalog() {
  // AppConfig is augmented loosely across layers; cast to the slices we read.
  const appConfig = useAppConfig() as {
    croutonBlocks?: Record<string, CroutonBlockDefinition>
    croutonLayoutBlocks?: CroutonLayoutBlockRegistry
  }

  /** id → shared-core projection, merged across both registries. */
  const catalog = computed<Record<string, CroutonBlockCore>>(() =>
    buildBlockCatalog(appConfig.croutonBlocks || {}, appConfig.croutonLayoutBlocks || {}),
  )

  /** Resolve any block id to its shared-core projection (or undefined). */
  function getBlock(id: string): CroutonBlockCore | undefined {
    return catalog.value[id]
  }

  /** List blocks, optionally filtered to one surface (e.g. a panes palette). */
  function listBlocks(surface?: CroutonBlockCore['surface']): CroutonBlockCore[] {
    const all = Object.values(catalog.value)
    return surface ? all.filter(b => b.surface === surface) : all
  }

  return { catalog, getBlock, listBlocks }
}
