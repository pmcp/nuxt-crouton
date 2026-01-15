export default {
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
      sortable: true
    }
  ],
  targets: [
    { layer: 'bookings', collections: ['locations', 'bookings', 'settings'] },
    { layer: 'pages', collections: ['pages'] }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,
    useMaps: true,
    force: true
  }
}