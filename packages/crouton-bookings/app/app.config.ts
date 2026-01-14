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
      // These appear as sub-items under the "Bookings" section
      adminRoutes: [
        {
          path: '/bookings',
          label: 'bookings.admin.overview',
          icon: 'i-lucide-calendar'
        },
        {
          path: '/bookings/email-templates',
          label: 'bookings.settings.emailTemplates',
          icon: 'i-lucide-mail'
        },
        {
          path: '/bookings/email-logs',
          label: 'bookings.settings.emailLogs',
          icon: 'i-lucide-file-text'
        }
      ],
      // Settings routes - empty (booking settings are under /bookings/ not /settings/)
      settingsRoutes: []
    }
  }
})
