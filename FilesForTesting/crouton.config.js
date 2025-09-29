// Test configuration file for nuxt-crouton collection generator
// This config demonstrates various options and can be used for testing

export default {
  // Path to your JSON schema file
  schemaPath: '/Users/pmcp/Projects/EchafTest/test-product-schema.json',

  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // Target layers and collections to generate
  targets: [
    {
      layer: 'shop',
      collections: ['products']
    }
  ],

  // Optional flags matching the command line options
  flags: {
    // Skip translation fields (--no-translations)
    noTranslations: true,

    // Force generation even if files exist (--force)
    force: true,

    // Skip database table creation (--no-db)
    noDb: false,

    // Preview what will be generated without creating files (--dry-run)
    dryRun: false,

    // Add relation stubs in comments (--auto-relations)
    autoRelations: false,

    // Use team authentication utility (--use-team-utility)
    useTeamUtility: false,

    // Include metadata fields like createdAt/updatedAt
    useMetadata: true,

    // Number of retries for database operations
    retries: 0
  }
}

// Usage:
// npx crouton-generate config ./FilesForTesting/crouton.config.js
// OR
// npx crouton-generate --config ./FilesForTesting/crouton.config.js