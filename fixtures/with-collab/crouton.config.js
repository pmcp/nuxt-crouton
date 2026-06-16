export default {
  // Feature flags - which crouton packages to enable
  features: {
    // Exercises @fyit/crouton-collab (realtime/Yjs). Spike fixture (#210): the
    // surface only asserts a collab UI component mounts single-client without
    // runtime errors — enough to catch boot/scaffolder regressions.
    collab: true
  },

  // Minimal e2e fixture variant: one simple collection for generic list + CRUD,
  // plus the crouton-collab mount surface.
  collections: [
    { name: 'items', fieldsFile: './schemas/items.json' }
  ],

  targets: [
    { layer: 'main', collections: ['items'] }
  ],

  dialect: 'sqlite'
}
