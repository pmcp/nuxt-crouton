export default defineAppConfig({
  // Container config for assets collection (form component is auto-detected via manifest)
  croutonCollections: {
    croutonAssets: {
      container: 'modal'
    }
  },

  // App auto-discovery registration for crouton-assets
  croutonApps: {
    assets: {
      id: 'assets',
      name: 'assets.title',
      icon: 'i-lucide-image',
      // API route prefixes for devtools operation tracking
      apiRoutes: ['/api/assets/'],
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
