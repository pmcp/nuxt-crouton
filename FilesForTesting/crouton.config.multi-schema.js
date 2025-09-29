// Advanced multi-schema configuration for nuxt-crouton collection generator
// This config demonstrates using different schemas for different collections

export default {
  // Define collections with their own schema files
  collections: [
    // Shop collections
    { name: 'products', fieldsFile: '/Users/pmcp/Projects/EchafTest/test-product-schema.json' },
    { name: 'categories', fieldsFile: './FilesForTesting/schemas/category-schema.json' },
    { name: 'inventory', fieldsFile: './FilesForTesting/schemas/inventory-schema.json' },
    { name: 'orders', fieldsFile: './FilesForTesting/schemas/order-schema.json' },

    // Blog collections
    { name: 'posts', fieldsFile: './FilesForTesting/schemas/post-schema.json' },
    { name: 'comments', fieldsFile: './FilesForTesting/schemas/comment-schema.json' },
    { name: 'authors', fieldsFile: './FilesForTesting/schemas/author-schema.json' },

    // Admin collections
    { name: 'users', fieldsFile: './FilesForTesting/schemas/user-schema.json' },
    { name: 'roles', fieldsFile: './FilesForTesting/schemas/role-schema.json' },
    { name: 'permissions', fieldsFile: './FilesForTesting/schemas/permission-schema.json' },

    // Marketing collections
    { name: 'campaigns', fieldsFile: './FilesForTesting/schemas/campaign-schema.json' },
    { name: 'newsletters', fieldsFile: './FilesForTesting/schemas/newsletter-schema.json' },
    { name: 'subscribers', fieldsFile: './FilesForTesting/schemas/subscriber-schema.json' }
  ],

  // Specify which collections go in which layers
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

  // Database configuration
  dialect: 'sqlite',

  // Flags
  flags: {
    noTranslations: false,  // Include translation fields for this multi-lingual app
    force: true,            // Overwrite existing files
    noDb: false,           // Create database tables
    dryRun: false,         // Actually create files (not just preview)
    autoRelations: true,   // Generate relation stubs
    useTeamUtility: true,  // Enable team-based authentication
    useMetadata: true      // Include timestamps
  }
}

// This advanced configuration:
// - Uses different schemas for each collection type
// - Organizes collections into logical layers
// - Enables team-based features
// - Includes translation support for multi-lingual apps
// - Generates relation stubs for easier relationship setup
//
// Note: The schema files referenced here would need to exist for this to work
// This is just an example showing the structure
//
// Usage:
// npx crouton-generate config ./FilesForTesting/crouton.config.multi-schema.js