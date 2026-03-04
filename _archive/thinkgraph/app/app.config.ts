export default defineAppConfig({
  croutonApps: {
    thinkgraph: {
      id: 'thinkgraph',
      name: 'ThinkGraph',
      icon: 'i-lucide-brain-circuit',
      adminRoutes: [
        {
          path: '/graph',
          label: 'Graph',
          icon: 'i-lucide-brain-circuit'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
      apiRoutes: ['/api/teams/']
    }
  }
})
