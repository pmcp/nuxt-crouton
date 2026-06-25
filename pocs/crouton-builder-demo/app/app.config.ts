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
    'demo-b': { id: 'demo-b', name: 'Detail', description: 'Demo KPIs', icon: 'i-lucide-bar-chart-3', component: 'CroutonLayoutSpikeStats', kind: 'atomic', category: 'data', minWidth: 200, defaultSize: 60 }
  }
})
