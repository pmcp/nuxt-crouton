export default {
  // Feature flags - which crouton packages to enable
  features: {
    // Exercises @fyit/crouton-assets so the optional CroutonAssetsPicker
    // (stub/priority pattern) can be asserted to actually mount in the e2e
    // smoke (#209), rather than the no-op core stub.
    assets: true
  },

  // Minimal e2e fixture variant: one simple collection for generic list + CRUD,
  // plus the crouton-assets picker surface.
  collections: [
    { name: 'items', fieldsFile: './schemas/items.json' }
  ],

  targets: [
    { layer: 'main', collections: ['items'] }
  ],

  dialect: 'sqlite'
}
