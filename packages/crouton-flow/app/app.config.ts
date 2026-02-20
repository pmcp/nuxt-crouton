export default defineAppConfig({
  croutonApps: {
    flow: {
      id: 'flow',
      name: 'flow.name',
      icon: 'i-lucide-share-2',
      adminRoutes: [
        {
          path: '/flows',
          label: 'flow.admin.flows',
          icon: 'i-lucide-share-2'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
      apiRoutes: ['/api/crouton-flow/']
    }
  }
})
