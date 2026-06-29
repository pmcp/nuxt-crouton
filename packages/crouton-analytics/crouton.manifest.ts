import { defineCroutonManifest } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-analytics',
  name: 'Analytics',
  description: 'Provider-agnostic usage analytics — PostHog default, swappable backend, lean-loop events',
  icon: 'i-lucide-line-chart',
  version: '0.1.0',
  category: 'addon',
  aiHint: 'use when an app or POC needs product-usage analytics (pageviews, funnels, lean-startup validation events). PostHog by default (already wired in this org); swappable to a self-host sink. NOT for CRUD audit — that is crouton-events.',
  dependencies: [],
  provides: {
    composables: [
      { name: 'useCroutonAnalytics', description: 'track()/pageview()/identify()/optOut() with a swappable provider resolved from runtime config' }
    ]
  }
})
