export default defineAppConfig({
  // App auto-discovery registration for crouton-bookings
  croutonApps: {
    bookings: {
      id: 'bookings',
      name: 'Bookings',
      icon: 'i-lucide-calendar',
      // User-facing routes (appear in /dashboard/[team]/ sidebar)
      dashboardRoutes: [
        {
          path: '/bookings',
          label: 'bookings.myBookings.title',
          icon: 'i-lucide-calendar'
        }
      ],
      // Admin routes (appear in /admin/[team]/ sidebar)
      adminRoutes: [
        {
          path: '/bookings',
          label: 'bookings.admin.title',
          icon: 'i-lucide-calendar'
        }
      ],
      // Settings routes (appear in /admin/[team]/settings/)
      settingsRoutes: [
        {
          path: '/email-templates',
          label: 'bookings.settings.emailTemplates',
          icon: 'i-lucide-mail'
        }
      ]
    }
  }
})
