export default defineAppConfig({
  croutonApps: {
    categorize: {
      id: 'categorize',
      name: 'Categorize',
      icon: 'i-lucide-group',
      adminRoutes: [
        {
          path: '/categorize',
          label: 'Categorize',
          icon: 'i-lucide-group',
        },
      ],
      dashboardRoutes: [],
      settingsRoutes: [],
    },
  },
})
