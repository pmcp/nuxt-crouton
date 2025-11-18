// Configuration for nuxt-crouton-events collection
// Generates the events tracking collection using the scaffolder

export default {
  // Define the events collection with its schema
  collections: [
    {
      name: 'croutonEvents',
      fieldsFile: './packages/nuxt-crouton-events/events-schema.json'
    }
  ],

  // Target: crouton-events layer (the package we created)
  targets: [
    {
      layer: 'crouton-events',
      collections: ['croutonEvents']
    }
  ],

  // Database configuration
  dialect: 'sqlite',

  // Flags
  flags: {
    noTranslations: true,   // Events don't need translations
    force: false,           // Don't overwrite by default
    noDb: false,           // Create database table
    dryRun: false,         // Actually create files
    autoRelations: false,  // No relations needed for events
    useTeamUtility: true   // Use team-based auth
  }
}
