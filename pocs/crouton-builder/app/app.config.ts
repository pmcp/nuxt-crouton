import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
  },
  // The builder's block palette — the proven v52 demo blocks (#988). Backend-free; each renders
  // a distinct, recognizable UI so you can see which block landed where. `sizing` (#986): the
  // typed component contract — a bar HUGS its height (→ short bar wherever it lands); list/form/
  // chart/stats FILL. `variant` (#970): the bounded display-variant enum on the list block.
  croutonLayoutBlocks: {
    'artists-list': {
      id: 'artists-list', name: 'Artists · List', description: 'All artists', icon: 'i-lucide-list', component: 'SpikeListBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 50, sizing: { width: 'fill', height: 'fill' },
      configSchema: [{
        name: 'variant', type: 'select', label: 'Display', default: 'rows',
        options: [
          { label: 'Rows', value: 'rows' },
          { label: 'Cards', value: 'cards' },
          { label: 'Table', value: 'table' },
        ],
      }],
    },
    'artists-form': { id: 'artists-form', name: 'Artists · New', description: 'Create an artist', icon: 'i-lucide-square-pen', component: 'SpikeFormBlock', kind: 'atomic', category: 'form', minWidth: 200, defaultSize: 50, sizing: { width: 'fill', height: 'fill' } },
    'artists-stats': { id: 'artists-stats', name: 'Artists · Stats', description: 'Artist KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 180, defaultSize: 50, sizing: { width: 'fill', height: 'fill' } },
    'artists-chart': { id: 'artists-chart', name: 'Bookings · Chart', description: 'Bookings per week', icon: 'i-lucide-bar-chart-3', component: 'SpikeChartBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 50, sizing: { width: 'fill', height: 'fill' } },
    // Bars HUG their height → a pinned Top bar / Bottom nav comes out SHORT automatically (#986).
    'app-toolbar': { id: 'app-toolbar', name: 'Top bar', description: 'Title + search + actions (pin to top)', icon: 'i-lucide-panel-top', component: 'SpikeToolbarBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 100, sizing: { width: 'fill', height: 'hug' } },
    'app-nav': { id: 'app-nav', name: 'Bottom nav', description: 'Tab bar (pin to bottom)', icon: 'i-lucide-panel-bottom', component: 'SpikeNavBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 100, sizing: { width: 'fill', height: 'hug' } },
    // Spacer (#952): a layout primitive that renders empty space — snap/reorder/resize like any block.
    'spacer': { id: 'spacer', name: 'Spacer', description: 'Empty space (push blocks around / hold a gap)', icon: 'i-lucide-square-dashed', component: 'SpikeSpacer', kind: 'atomic', category: 'data', minWidth: 40, defaultSize: 20, sizing: { width: 'fill', height: 'fill' } },
    // Drop-ghost (#946): the placeholder spliced in while an internal insert is armed.
    '__dropghost__': { id: '__dropghost__', name: 'Drop preview', description: 'Where the dragged item lands', icon: 'i-lucide-plus', component: 'SpikeGhostPane', kind: 'atomic', category: 'data', minWidth: 60 },
  },
})
