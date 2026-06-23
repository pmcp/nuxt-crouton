import { describe, it, expect } from 'vitest'
import {
  documentBlockToCore,
  layoutBlockToCore,
  buildBlockCatalog,
} from '../useCroutonBlockCatalog'
import type { CroutonBlockDefinition } from '../../types/block-definition'
import type { CroutonLayoutBlockRegistry } from '../../types/layout-block'

const documentBlocks: Record<string, CroutonBlockDefinition> = {
  mapBlock: {
    type: 'mapBlock',
    name: 'Map',
    description: 'Embed a map',
    icon: 'i-lucide-map-pin',
    category: 'content',
    clientOnly: true,
    defaultAttrs: {},
    schema: [],
    components: { editorView: 'CroutonMapsBlocksMapBlockView', renderer: 'CroutonMapsBlocksMapBlockRender' },
    tiptap: { parseHTMLTag: 'div[data-type="map-block"]', attributes: {} },
  },
}

const layoutBlocks: CroutonLayoutBlockRegistry = {
  'collection-list': {
    id: 'collection-list',
    name: 'List',
    description: 'A list surface',
    icon: 'i-lucide-list',
    component: 'CroutonLayoutSpikeList',
    category: 'data',
  },
}

describe('block catalog — surface projection', () => {
  it('projects a TipTap content block onto the shared core (type → id, components.renderer → renderer)', () => {
    expect(documentBlockToCore(documentBlocks.mapBlock!)).toEqual({
      id: 'mapBlock',
      name: 'Map',
      description: 'Embed a map',
      icon: 'i-lucide-map-pin',
      category: 'content',
      renderer: 'CroutonMapsBlocksMapBlockRender',
      clientOnly: true,
      surface: 'document',
    })
  })

  it('projects a pane block onto the shared core (id, component → renderer)', () => {
    expect(layoutBlockToCore(layoutBlocks['collection-list']!)).toEqual({
      id: 'collection-list',
      name: 'List',
      description: 'A list surface',
      icon: 'i-lucide-list',
      category: 'data',
      renderer: 'CroutonLayoutSpikeList',
      surface: 'pane',
    })
  })
})

describe('block catalog — unified resolution across both registries', () => {
  it('resolves a document block and a pane block from one merged map', () => {
    const catalog = buildBlockCatalog(documentBlocks, layoutBlocks)
    expect(catalog.mapBlock?.surface).toBe('document')
    expect(catalog['collection-list']?.surface).toBe('pane')
    expect(Object.keys(catalog)).toHaveLength(2)
  })

  it('has no entry for an unknown id (the allowlist holds at the catalog layer)', () => {
    const catalog = buildBlockCatalog(documentBlocks, layoutBlocks)
    expect(catalog['totally-not-real']).toBeUndefined()
  })

  it('lets a pane block win an id collision (documented precedence)', () => {
    const collidingLayout: CroutonLayoutBlockRegistry = {
      mapBlock: { id: 'mapBlock', name: 'Pane Map', description: '', icon: '', component: 'PaneMap' },
    }
    const catalog = buildBlockCatalog(documentBlocks, collidingLayout)
    expect(catalog.mapBlock?.surface).toBe('pane')
    expect(catalog.mapBlock?.renderer).toBe('PaneMap')
  })

  it('handles empty registries', () => {
    expect(buildBlockCatalog({}, {})).toEqual({})
  })
})
