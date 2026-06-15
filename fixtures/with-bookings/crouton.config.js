export default {
  // Feature flags - which crouton packages to enable
  features: {
    bookings: {
      "config": {
        "email": {
          "enabled": false
        },
        "bookingModes": [
          "slots"
        ]
      }
    }
  },

  // e2e fixture: one simple collection to exercise generic list + CRUD
  // (the bookings package supplies its own collections + admin UI).
  collections: [
    { name: 'items', fieldsFile: './schemas/items.json' }
  ],

  targets: [
    { layer: 'main', collections: ['items'] }
  ],

  dialect: 'sqlite'
}
