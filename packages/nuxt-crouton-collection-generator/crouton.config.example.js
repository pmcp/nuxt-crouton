// Example configuration for nuxt-crouton collection generator
// Copy this file to crouton.config.js and customize for your needs

export default {
  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // ============================================================
  // ENHANCED FORMAT (recommended): Define collections with individual schemas
  // ============================================================
  collections: [
    {
      name: 'products',
      fieldsFile: './schemas/products.json'
    },
    {
      name: 'categories',
      fieldsFile: './schemas/categories.json'
    },
    {
      name: 'pages',
      fieldsFile: './schemas/pages.json',
      hierarchy: true  // Enable tree hierarchy (adds parentId, path, depth, order fields)
    }
  ],

  // Target layers and collections to generate
  targets: [
    {
      layer: 'shop',           // Layer name (will create layers/shop/collections/...)
      collections: ['products', 'categories'] // Collection names from 'collections' array above
    },
    {
      layer: 'content',
      collections: ['pages']   // Pages with hierarchy enabled
    }
  ],

  // ============================================================
  // SIMPLE FORMAT (legacy): Single schema for all collections
  // ============================================================
  // schemaPath: './crouton-schema.json',
  // targets: [
  //   { layer: 'shop', collections: ['products'] }
  // ],

  // External connectors for :referenced collections (e.g., :users, :teams)
  // When you reference collections with : prefix in schemas, configure them here
  connectors: {
    // Example: users collection from auth system
    // users: {
    //   type: 'supersaas',      // Connector type: 'supersaas', 'supabase', 'clerk'
    //   autoInstall: true,       // Install @friendlyinternet/nuxt-crouton-connector
    //   copyFiles: true,         // Copy connector files to project
    //   updateAppConfig: true    // Auto-register in app.config.ts
    // },

    // If not configured, generator will prompt interactively when :references are detected
  },

  // Optional flags
  flags: {
    // Team-based multi-tenancy: Automatically adds teamId & userId fields to schemas
    // and generates simplified API endpoints with team-based authentication
    // When true: teamId and userId are added to ALL collections
    // When false: No team fields are added (for single-tenant apps)
    useTeamUtility: false,

    // Metadata timestamps: Automatically adds createdAt & updatedAt fields to schemas
    // When true: timestamps are added to ALL collections (default)
    // When false: No timestamp fields are added
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

    // Number of retries for database operations
    retries: 0,

    // Auto-configure connectors without prompting (uses connectors config above)
    autoConnectors: false
  }
}