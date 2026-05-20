export default defineAppConfig({
  // App auto-discovery registration for crouton-sales
  croutonApps: {
    sales: {
      id: 'sales',
      name: 'sales.title',
      icon: 'i-lucide-shopping-cart',
      // API route prefixes for devtools operation tracking
      apiRoutes: ['/api/crouton-sales/'],
      // Admin routes (appear in /admin/[team]/ sidebar).
      // Each entry maps 1:1 to a page under app/pages/admin/[team]/sales/.
      adminRoutes: [
        {
          path: '/sales',
          label: 'sales.admin.overview',
          icon: 'i-lucide-shopping-cart'
        },
        {
          path: '/sales/events',
          label: 'sales.sidebar.events',
          icon: 'i-lucide-calendar'
        },
        {
          path: '/sales/products',
          label: 'sales.sidebar.products',
          icon: 'i-lucide-package'
        },
        {
          path: '/sales/categories',
          label: 'sales.sidebar.categories',
          icon: 'i-lucide-folder'
        },
        {
          path: '/sales/orders',
          label: 'sales.orders.title',
          icon: 'i-lucide-receipt'
        },
        {
          path: '/sales/locations',
          label: 'sales.sidebar.locations',
          icon: 'i-lucide-map-pin'
        },
        {
          path: '/sales/printers',
          label: 'sales.sidebar.printers',
          icon: 'i-lucide-printer'
        },
        {
          path: '/sales/helpers',
          label: 'sales.sidebar.helpers',
          icon: 'i-lucide-users'
        },
        {
          path: '/sales/clients',
          label: 'sales.sidebar.clients',
          icon: 'i-lucide-user'
        }
      ],
      dashboardRoutes: [],
      settingsRoutes: []
    }
  }
})
