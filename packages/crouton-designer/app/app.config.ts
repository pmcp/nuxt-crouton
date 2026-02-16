export default defineAppConfig({
  croutonApps: {
    designer: {
      id: 'designer',
      name: 'designer.name',
      icon: 'i-lucide-layout-grid',
      adminRoutes: [
        {
          path: '/designer',
          label: 'designer.schemaDesigner',
          icon: 'i-lucide-layout-grid'
        }
      ],
      settingsRoutes: []
    }
  }
})
