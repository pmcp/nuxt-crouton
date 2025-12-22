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
    }
  ],
  targets: [
    { layer: 'bookings', collections: ['locations', 'bookings', 'settings'] }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,
    force: true
  }
}