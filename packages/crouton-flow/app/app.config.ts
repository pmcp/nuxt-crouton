export default defineAppConfig({
  croutonApps: {
    flow: {
      id: 'flow',
      name: 'Flow',
      icon: 'i-lucide-share-2',
      adminRoutes: [
        {
          path: '/flows',
          label: 'Flows',
          icon: 'i-lucide-share-2'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
      apiRoutes: ['/api/crouton-flow/']
    }
  }
})
