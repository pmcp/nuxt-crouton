export default {
  // Feature flags - which crouton packages to enable
  features: {
    // Core (enabled by default): auth, admin, i18n
    // Optional features:
    editor: true,  // For rich text in pages
    // bookings: true,  // Enable when using bookings package
  },

  // Collections to generate (used by CLI)
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