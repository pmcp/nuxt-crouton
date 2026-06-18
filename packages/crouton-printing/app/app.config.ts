export default defineAppConfig({
  croutonApps: {
    // Registers as 'printing' — detectable via useCroutonApps().hasApp('printing').
    // Headless capability layer (no admin routes of its own); domain packages
    // surface the printer config + job status UI within their own workspaces.
    printing: {
      id: 'printing',
      name: 'printing.name',
      icon: 'i-lucide-printer',
      adminRoutes: [],
      dashboardRoutes: [],
      settingsRoutes: [],
      apiRoutes: ['/api/crouton-printing/']
    }
  }
})
