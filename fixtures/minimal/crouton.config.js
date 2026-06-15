export default {
  // Feature flags - which crouton packages to enable
  features: {
  },

  // Minimal e2e fixture: one simple collection to exercise list + CRUD
  collections: [
    { name: 'items', fieldsFile: './schemas/items.json' }
  ],

  targets: [
    { layer: 'main', collections: ['items'] }
  ],

  dialect: 'sqlite'
}
