export default defineAppConfig({
  // App auto-discovery registration for crouton-charts
  croutonApps: {
    charts: {
      id: 'charts',
      name: 'Charts',
      icon: 'i-lucide-chart-bar',
      // API route prefixes for devtools operation tracking
      apiRoutes: [],
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
