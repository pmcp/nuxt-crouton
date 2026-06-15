export default {
  features: {
    pages: true
  },

  // e2e fixture: one simple collection to exercise list + CRUD alongside the pages package
  collections: [
    { name: 'items', fieldsFile: './schemas/items.json' }
  ],

  targets: [
    { layer: 'main', collections: ['items'] }
  ],

  dialect: 'sqlite'
}
