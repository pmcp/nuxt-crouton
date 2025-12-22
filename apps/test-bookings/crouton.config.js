export default {
  collections: [
    {
      name: 'bookings',
      fieldsFile: './schemas/booking.json',
      sortable: false,
      translatable: false
    },
    {
      name: 'locations',
      fieldsFile: './schemas/location.json',
      sortable: true,
      translatable: false
    },
    {
      name: 'settings',
      fieldsFile: './schemas/settings.json',
      sortable: false,
      translatable: false
    }
  ],
  targets: [
    { layer: 'bookings', collections: ['bookings', 'locations', 'settings'] }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,
    force: true
  }
}
