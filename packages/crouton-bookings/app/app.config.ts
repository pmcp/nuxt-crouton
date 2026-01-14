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
          id: 'calendar',
          name: 'Booking Calendar',
          description: 'Interactive calendar for customers to view availability and make bookings',
          icon: 'i-lucide-calendar',
          component: 'CroutonBookingsPanel',
          category: 'customer',
          configSchema: [
            {
              name: 'defaultView',
              label: 'Default View',
              type: 'select',
              default: 'week',
              options: [
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' }
              ]
            },
            {
              name: 'showFilters',
              label: 'Show Filters',
              type: 'boolean',
              default: true
            }
          ]
        },
        {
          id: 'my-bookings',
          name: 'My Bookings',
          description: 'Shows logged-in users their upcoming and past bookings',
          icon: 'i-lucide-list',
          component: 'CroutonBookingsList',
          category: 'customer',
          requiresAuth: true,
          configSchema: [
            {
              name: 'showPastBookings',
              label: 'Show Past Bookings',
              type: 'boolean',
              default: true
            },
            {
              name: 'pageSize',
              label: 'Items Per Page',
              type: 'number',
              default: 10
            }
          ]
        },
        {
          id: 'wizard',
          name: 'Booking Wizard',
          description: 'Multi-step booking flow for customers to complete a reservation',
          icon: 'i-lucide-wand-2',
          component: 'CroutonBookingsCustomerBookingWizard',
          category: 'customer',
          configSchema: [
            {
              name: 'allowLocationSelection',
              label: 'Allow Location Selection',
              type: 'boolean',
              default: true
            }
          ]
        }
      ]
    }
  }
})
