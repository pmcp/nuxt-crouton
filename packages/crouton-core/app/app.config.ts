import { croutonRedirectsConfig } from './composables/useCroutonRedirects'
import type { CroutonLayoutBlockRegistry } from './types/layout-block'

// Core layout blocks (Sprint 1 #704 → real data-bound blocks Sprint 4 #709).
// `collection-list` / `entity-form` are now REAL data-bound surfaces (they render
// an actual generated collection by name via the `collection` config), placed by
// the deterministic layout pass (`composeDefaultLayout`). Package blocks (e.g. the
// bookings calendar) register the same way; each layer can contribute its own
// `croutonLayoutBlocks` entries (defu-merged).
const croutonLayoutBlocks: CroutonLayoutBlockRegistry = {
  'collection-list': {
    id: 'collection-list',
    name: 'List',
    description: 'Live rows of a collection',
    icon: 'i-lucide-list',
    component: 'CroutonLayoutCollection',
    kind: 'atomic',
    category: 'data',
    // Sizing contract (#710): a list collapses to cards but needs ~260px to stay legible.
    minWidth: 260,
    defaultSize: 34,
    configSchema: [
      // The collection (registry key, e.g. `mainItems`) this block binds to.
      { name: 'collection', type: 'text', label: 'Collection', default: '' },
      { name: 'heading', type: 'text', label: 'Heading', default: '' },
      {
        name: 'layout',
        type: 'select',
        label: 'Layout',
        default: 'list',
        options: [
          { label: 'List', value: 'list' },
          { label: 'Grid', value: 'grid' },
          { label: 'Table', value: 'table' },
        ],
      },
    ],
  },
  'entity-form': {
    id: 'entity-form',
    name: 'Form',
    description: 'Create form for a collection',
    icon: 'i-lucide-square-pen',
    component: 'CroutonLayoutForm',
    kind: 'atomic',
    category: 'data',
    // A form drops to a single column under ~480px; below ~320px fields crush.
    minWidth: 320,
    defaultSize: 50,
    configSchema: [
      { name: 'collection', type: 'text', label: 'Collection', default: '' },
      { name: 'heading', type: 'text', label: 'Heading', default: '' },
    ],
  },
  'stats': {
    id: 'stats',
    name: 'Stats',
    description: 'KPI cards',
    icon: 'i-lucide-bar-chart-3',
    component: 'CroutonLayoutSpikeStats',
    kind: 'atomic',
    category: 'data',
    // KPI cards reflow to one column gracefully — fluid, modest floor.
    minWidth: 200,
    defaultSize: 40,
  },
}

export default defineAppConfig({
  croutonCollections: {
    croutonRedirects: croutonRedirectsConfig,
  },
  croutonLayoutBlocks,
})
