export default defineAppConfig({
  croutonApps: {
    designer: {
      id: 'designer',
      name: 'Schema Designer',
      icon: 'i-lucide-layout-grid',
      adminRoutes: [
        {
          path: '/designer',
          label: 'Schema Designer',
          icon: 'i-lucide-layout-grid'
        }
      ],
      settingsRoutes: []
    }
  }
})
