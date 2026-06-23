import { croutonRedirectsConfig } from './composables/useCroutonRedirects'
import type { CroutonLayoutBlockRegistry } from './types/layout-block'

// Initial layout blocks (Sprint 1, #704). Throwaway spike blocks for now; real
// package blocks (calendar, generated list/form) register the same way. Each
// layer can contribute its own `croutonLayoutBlocks` entries (defu-merged).
const croutonLayoutBlocks: CroutonLayoutBlockRegistry = {
  'collection-list': {
    id: 'collection-list',
    name: 'List',
    description: 'A simple list surface',
    icon: 'i-lucide-list',
    component: 'CroutonLayoutSpikeList',
    kind: 'atomic',
    category: 'data',
    configSchema: [
      { name: 'heading', type: 'text', label: 'Heading', default: 'Items' },
    ],
  },
  'entity-form': {
    id: 'entity-form',
    name: 'Form',
    description: 'A form surface',
    icon: 'i-lucide-square-pen',
    component: 'CroutonLayoutSpikeForm',
    kind: 'atomic',
    category: 'data',
  },
  'stats': {
    id: 'stats',
    name: 'Stats',
    description: 'KPI cards',
    icon: 'i-lucide-bar-chart-3',
    component: 'CroutonLayoutSpikeStats',
    kind: 'atomic',
    category: 'data',
  },
}

export default defineAppConfig({
  croutonCollections: {
    croutonRedirects: croutonRedirectsConfig,
  },
  croutonLayoutBlocks,
})
