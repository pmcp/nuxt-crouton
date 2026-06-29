import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'
import { pagesPagesConfig } from '../layers/pages/collections/pages/app/composables/usePagesPages'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
    pagesPages: pagesPagesConfig
  },
  // Backend-free demo blocks for the builder preview — both reuse the generic KPI
  // block under DISTINCT ids so the collapse demo collapses one pane and reflows the
  // other (collapse is keyed by blockId). defu-merged with the crouton-layout defaults.
  croutonLayoutBlocks: {
    'demo-a': { id: 'demo-a', name: 'Overview', description: 'Demo KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 40 },
    'demo-b': { id: 'demo-b', name: 'Detail', description: 'Demo KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 60 },
    // Spike (#903): the blocks a collection ("Artists") would offer — list / form / stats.
    // All render the backend-free KPI block; the spike is about the drawer→drag→compile
    // loop, not the block fidelity. Distinct names/icons so the drawer reads right.
    'artists-list': { id: 'artists-list', name: 'Artists · List', description: 'All artists', icon: 'i-lucide-list', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 220, defaultSize: 50 },
    'artists-form': { id: 'artists-form', name: 'Artists · New', description: 'Create an artist', icon: 'i-lucide-square-pen', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'form', minWidth: 220, defaultSize: 50 },
    'artists-stats': { id: 'artists-stats', name: 'Artists · Stats', description: 'Artist KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 50 },
    // Spacer (#952): a layout primitive that renders empty space — add it to push blocks around or
    // hold a gap. A real block, so it snaps/reorders/resizes like any other; small minWidth so it can
    // be a thin gutter. Renders SpikeSpacer (a faint dashed hint in the builder, blank in a real app).
    'spacer': { id: 'spacer', name: 'Spacer', description: 'Empty space (push blocks around / hold a gap)', icon: 'i-lucide-square-dashed', component: 'SpikeSpacer', kind: 'atomic', category: 'data', minWidth: 40, defaultSize: 20 },
    // Drop-ghost (#946): the placeholder pane spliced in while an internal insert is armed, so the
    // real panes ease apart to open its slot. NOT shown in the drawer (that list is hardcoded). A
    // small minWidth so opening the slot never forces the split to stack.
    '__dropghost__': { id: '__dropghost__', name: 'Drop preview', description: 'Where the dragged item lands', icon: 'i-lucide-plus', component: 'SpikeGhostPane', kind: 'atomic', category: 'data', minWidth: 60 }
  }
})
