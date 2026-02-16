export default defineAppConfig({
  // App auto-discovery registration for crouton-pages
  croutonApps: {
    pages: {
      id: 'pages',
      name: 'Pages',
      icon: 'i-lucide-file-text',
      // Admin routes (appear in /admin/[team]/ sidebar)
      adminRoutes: [
        {
          path: '/workspace',
          label: 'pages.admin.pages',
          icon: 'i-lucide-file-text'
        }
      ],
      // No dashboard routes - pages are public-facing
      dashboardRoutes: [],
      // No settings routes - page settings are managed in admin
      settingsRoutes: [],
      // Core page type for regular content pages
      pageTypes: [
        {
          id: 'regular',
          name: 'Regular Page',
          description: 'Standard content page with rich text editor',
          icon: 'i-lucide-file-text',
          component: 'CroutonPagesRegularContent',
          category: 'content',
          configSchema: []
        }
      ]
    }
  }
})
