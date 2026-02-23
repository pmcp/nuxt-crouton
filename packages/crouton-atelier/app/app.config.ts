export default defineAppConfig({
  croutonApps: {
    atelier: {
      id: 'atelier',
      name: 'atelier.name',
      icon: 'i-lucide-blocks',
      adminRoutes: [
        {
          path: '/atelier',
          label: 'atelier.appBuilder',
          icon: 'i-lucide-blocks'
        }
      ],
      settingsRoutes: []
    }
  }
})
