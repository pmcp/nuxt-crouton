// Advanced multi-schema configuration for nuxt-crouton collection generator
// This config demonstrates using different schemas with translation support

export default {
  // Define collections with their own schema files
  collections: [
    // Shop collections
    { name: 'products', fieldsFile: './FilesForTesting/schemas/product-schema.json' },
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

  // Translation configuration - specify which fields are translatable per collection
  translations: {
    collections: {
      // Shop collections
      products: ['name', 'description', 'metaTitle', 'metaDescription'],
      categories: ['name', 'description'],

      // Blog collections
      posts: ['title', 'content', 'excerpt', 'metaTitle', 'metaDescription'],
      comments: ['content'],
      authors: ['bio'],

      // Admin collections (usually fewer translatable fields)
      roles: ['name', 'description'],
      permissions: ['name', 'description'],

      // Marketing collections
      campaigns: ['name', 'description', 'content'],
      newsletters: ['subject', 'content', 'previewText']
    }
  },

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
// - Includes full translation support with CroutonI18nInput component
// - Generates relation stubs for easier relationship setup
// - Maps translatable fields per collection (name, description, content, etc.)
//
// Usage:
// npx crouton-generate config ./FilesForTesting/crouton.config.multi-schema-with-translations.js
//
// The CroutonI18nInput component will now appear in forms for fields marked as translatable.
// Each translatable field will be moved into the translations UI instead of appearing as regular inputs.