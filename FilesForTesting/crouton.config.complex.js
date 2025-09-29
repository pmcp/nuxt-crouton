// Complex test configuration file for nuxt-crouton collection generator
// This config demonstrates multiple layers and collections

export default {
  // Path to your JSON schema file (shared by all collections in simple mode)
  schemaPath: '/Users/pmcp/Projects/EchafTest/test-product-schema.json',

  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // Multiple target layers with different collections
  targets: [
    {
      layer: 'shop',
      collections: ['products', 'categories', 'inventory', 'orders']
    },
    {
      layer: 'blog',
      collections: ['posts', 'comments', 'authors']
    },
    {
      layer: 'admin',
      collections: ['users', 'roles', 'permissions']
    },
    {
      layer: 'marketing',
      collections: ['campaigns', 'newsletters', 'subscribers']
    }
  ],

  // Optional flags
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
    autoRelations: true,

    // Use team authentication utility (--use-team-utility)
    useTeamUtility: false,

    // Include metadata fields like createdAt/updatedAt
    useMetadata: true,

    // Number of retries for database operations
    retries: 0
  }
}

// This configuration will generate:
//
// Layer: shop
//   - products collection
//   - categories collection
//   - inventory collection
//   - orders collection
//
// Layer: blog
//   - posts collection
//   - comments collection
//   - authors collection
//
// Layer: admin
//   - users collection
//   - roles collection
//   - permissions collection
//
// Layer: marketing
//   - campaigns collection
//   - newsletters collection
//   - subscribers collection
//
// Total: 4 layers, 14 collections - all using the same schema structure
//
// Usage:
// npx crouton-generate config ./FilesForTesting/crouton.config.complex.js