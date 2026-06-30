import { translationsUiConfig } from '@fyit/crouton-i18n/app/composables/useTranslationsUi'

export default defineAppConfig({
  croutonCollections: {
    translationsUi: translationsUiConfig,
  },
  // The builder's block palette (#988). Backend-free demo blocks — all render the adaptive
  // `BuilderBlock` — declared with the typed component contract (#986): `minWidth` (the
  // viability floor) + `sizing: { width, height: 'fill' | 'hug' }` (the bar blocks HUG their
  // height → short bars inside a split). `defu`-merged with the crouton-layout defaults.
  croutonLayoutBlocks: {
    'overview': { id: 'overview', name: 'Overview', description: 'KPI overview', icon: 'i-lucide-layout-dashboard', component: 'BuilderBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 40, sizing: { width: 'fill', height: 'fill' } },
    'artists-list': {
      id: 'artists-list', name: 'Artists · List', description: 'All artists', icon: 'i-lucide-list', component: 'BuilderBlock', kind: 'atomic', category: 'data', minWidth: 220, defaultSize: 55, sizing: { width: 'fill', height: 'fill' },
      variants: ['rows', 'cards', 'table'],
      configSchema: [{
        name: 'variant', type: 'select', label: 'Display', default: 'rows',
        options: [
          { label: 'Rows', value: 'rows' },
          { label: 'Cards', value: 'cards' },
          { label: 'Table', value: 'table' },
        ],
      }],
    },
    'artists-form': { id: 'artists-form', name: 'Artists · New', description: 'Create an artist', icon: 'i-lucide-square-pen', component: 'BuilderBlock', kind: 'atomic', category: 'form', minWidth: 200, defaultSize: 45, sizing: { width: 'fill', height: 'fill' } },
    'bookings-chart': { id: 'bookings-chart', name: 'Bookings · Chart', description: 'Bookings per week', icon: 'i-lucide-bar-chart-3', component: 'BuilderBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 50, sizing: { width: 'fill', height: 'fill' } },
    // Bars HUG their height → a Top bar / Bottom nav comes out SHORT inside a split (#986).
    'top-bar': { id: 'top-bar', name: 'Top bar', description: 'Title + search + actions', icon: 'i-lucide-panel-top', component: 'BuilderBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 100, sizing: { width: 'fill', height: 'hug' } },
    'bottom-nav': { id: 'bottom-nav', name: 'Bottom nav', description: 'Tab bar', icon: 'i-lucide-panel-bottom', component: 'BuilderBlock', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 100, sizing: { width: 'fill', height: 'hug' } },
  },
})
