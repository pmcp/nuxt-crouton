import type { CroutonBlockDefinition } from '@fyit/crouton-core/app/types/block-definition'

const bookingBlockDefinition: CroutonBlockDefinition = {
  type: 'bookingBlock',
  name: 'Booking',
  description: 'Embed a booking panel',
  icon: 'i-lucide-calendar-check',
  category: 'customer',
  clientOnly: true,
  defaultAttrs: {
    title: '',
    emptyMessage: ''
  },
  components: {
    editorView: 'CroutonBookingsBlocksBookingBlockView',
    renderer: 'CroutonBookingsBlocksBookingBlockRender'
  },
  schema: [
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      description: 'Optional heading displayed above the booking UI'
    },
    {
      name: 'emptyMessage',
      type: 'text',
      label: 'Empty message',
      description: 'Message shown when no bookings exist'
    }
  ],
  tiptap: {
    parseHTMLTag: 'div[data-type="booking-block"]',
    attributes: {
      title: { default: '' },
      emptyMessage: { default: '' }
    }
  }
}

export default defineAppConfig({
  // Package-provided form for bookings locations (overrides CLI-generated _Form.vue)
  croutonCollections: {
    bookingsLocations: {
      packageForm: 'CroutonBookingsLocationForm'
    }
  },
  // App auto-discovery registration for crouton-bookings
  croutonApps: {
    bookings: {
      id: 'bookings',
      name: 'bookings.title',
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

      // API route prefixes for devtools operation tracking
      apiRoutes: ['/api/crouton-bookings/'],

      // Page types for CMS integration
      // These appear when creating pages in /admin/[team]/pages
      pageTypes: [
        {
          id: 'booking',
          name: 'Booking Page',
          description: 'Interactive booking page with calendar and availability',
          icon: 'i-lucide-calendar',
          component: 'CroutonBookingsPanel',
          category: 'customer',
          preferredLayout: 'full-height'
        }
      ]
    }
  },
  croutonBlocks: {
    bookingBlock: bookingBlockDefinition
  }
})
