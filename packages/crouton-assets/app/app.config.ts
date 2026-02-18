export default defineAppConfig({
  // App auto-discovery registration for crouton-assets
  croutonApps: {
    assets: {
      id: 'assets',
      name: 'assets.title',
      icon: 'i-lucide-image',
      // Admin routes (appear in /admin/[team]/ sidebar)
      adminRoutes: [
        {
          path: '/media',
          label: 'assets.admin.media',
          icon: 'i-lucide-image'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
