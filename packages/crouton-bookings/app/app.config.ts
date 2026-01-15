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
          path: '/bookings/locations',
          label: 'bookings.admin.locations',
          icon: 'i-lucide-map-pin'
        },
        {
          path: '/bookings/settings',
          label: 'bookings.admin.settings',
          icon: 'i-lucide-settings'
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
      settingsRoutes: [],

      // Page types for CMS integration
      // These appear when creating pages in /admin/[team]/pages
      pageTypes: [
        {
          id: 'booking',
          name: 'Booking Page',
          description: 'Interactive booking page with calendar and availability',
          icon: 'i-lucide-calendar',
          component: 'CroutonBookingsPanel',
          category: 'customer'
        }
      ]
    }
  }
})
