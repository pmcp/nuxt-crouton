import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-charts',
  name: 'Charts',
  description: 'Chart visualizations powered by nuxt-charts, connected to collections',
  icon: 'i-lucide-chart-bar',
  version: '1.0.0',
  category: 'addon',
  aiHint: 'use when app needs data visualization, graphs, charts, analytics dashboards',
  dependencies: [],
  provides: {
    components: [
      {
        name: 'CroutonChartsWidget',
        description: 'Collection-driven chart component (bar, line, area, donut)',
        props: ['collection', 'type', 'xField', 'yFields', 'title', 'height', 'stacked']
      },
    ],
    composables: [
      { name: 'useCollectionChart', description: 'Fetch and transform collection data for charting' },
    ],
  },
})
