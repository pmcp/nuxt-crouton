export default defineAppConfig({
  // App auto-discovery registration — detectable via useCroutonApps().hasApp('analytics')
  croutonApps: {
    analytics: {
      id: 'analytics',
      name: 'Analytics',
      icon: 'i-lucide-line-chart',
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
