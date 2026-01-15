export default {
  // Define all collections (8 total - flows pattern replaces legacy configs)
  collections: [
    { name: 'flows', fieldsFile: './schemas/flow-schema.json' },
    { name: 'flowInputs', fieldsFile: './schemas/flow-inputs-schema.json' },
    { name: 'flowOutputs', fieldsFile: './schemas/flow-outputs-schema.json' },
    { name: 'discussions', fieldsFile: './schemas/discussion-schema.json' },
    { name: 'tasks', fieldsFile: './schemas/task-schema.json' },
    { name: 'jobs', fieldsFile: './schemas/job-schema.json' },
    { name: 'userMappings', fieldsFile: './schemas/user-mapping-schema.json' },
    { name: 'inboxMessages', fieldsFile: './schemas/inbox-message-schema.json' }
  ],

  // Organize into layers
  targets: [
    {
      layer: 'rakim',
      collections: [
        'flows',
        'flowInputs',
        'flowOutputs',
        'discussions',
        'tasks',
        'jobs',
        'userMappings',
        'inboxMessages'
      ]
    }
  ],

  // Database dialect
  dialect: 'sqlite',

  // Generation flags (compatible with nuxt-crouton-cli v2.0.0)
  flags: {
    useTeamUtility: true,    // Enable team-based multi-tenancy
    useMetadata: true,       // Add createdAt/updatedAt timestamps
    autoRelations: true,     // Generate relation stubs
    force: false,            // Don't overwrite existing files
    noTranslations: true,    // Disable i18n for now (can enable later)
    noDb: false,             // Generate database schema
    dryRun: false            // Actually generate files
  }
}