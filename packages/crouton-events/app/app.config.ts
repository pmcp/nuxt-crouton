export default defineAppConfig({
  // App auto-discovery registration for crouton-events
  croutonApps: {
    events: {
      id: 'events',
      name: 'events.title',
      icon: 'i-lucide-activity',
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
