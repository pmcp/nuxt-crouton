// Example configuration for nuxt-crouton collection generator
// Copy this file to crouton.config.js and customize for your needs

export default {
  // Path to your JSON schema file
  schemaPath: './crouton-schema.json',

  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // Target layers and collections to generate
  targets: [
    {
      layer: 'shop',           // Layer name (will create layers/shop/collections/...)
      collections: ['products'] // Collection names to generate
    },
    // Add more targets as needed
    // {
    //   layer: 'blog',
    //   collections: ['posts', 'categories']
    // }
  ],

  // Optional flags
  flags: {
    // Include metadata fields (createdAt, updatedAt)
    useMetadata: true,

    // Generate relation stubs in comments
    autoRelations: false,

    // Skip translation fields
    noTranslations: false,

    // Force generation even if files exist
    force: false,

    // Skip database table creation
    noDb: false,

    // Preview what will be generated without creating files
    dryRun: false,

    // Use team utility for authentication (if applicable)
    useTeamUtility: false,

    // Number of retries for database operations
    retries: 0
  }
}