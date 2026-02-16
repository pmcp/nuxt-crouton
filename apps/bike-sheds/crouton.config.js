export default {
  // Feature flags - which crouton packages to enable
  features: {
    editor: true,   // Rich text editing for pages
    bookings: true,  // Booking system UI + navigation
    pages: true,     // CMS pages UI + navigation
  },

  flags: {
    useMaps: true
  },

  // Collections to generate
  collections: [
    {
      name: 'locations',
      fieldsFile: './schemas/location.json',
      sortable: true,
      translatable: true
    },
    {
      name: 'bookings',
      fieldsFile: './schemas/booking.json'
    },
    {
      name: 'settings',
      fieldsFile: './schemas/settings.json'
    },
    {
      name: 'pages',
      fieldsFile: './schemas/pages.json',
      formComponent: 'CroutonPagesForm',
      sortable: true,
      hierarchy: {
        enabled: true,
        parentField: 'parentId',
        orderField: 'order',
        pathField: 'path',
        depthField: 'depth'
      }
    }
  ],

  targets: [
    { layer: 'bookings', collections: ['locations', 'bookings', 'settings'] },
    { layer: 'pages', collections: ['pages'] }
  ],

  dialect: 'sqlite'
}
