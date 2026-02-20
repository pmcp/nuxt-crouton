export default defineAppConfig({
  // App auto-discovery registration for crouton-ai
  croutonApps: {
    ai: {
      id: 'ai',
      name: 'ai.title',
      icon: 'i-lucide-sparkles',
      // API route prefixes for devtools operation tracking
      apiRoutes: ['/api/ai/'],
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
