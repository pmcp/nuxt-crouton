/**
 * Exhaustive Crouton Configuration Example
 * =========================================
 *
 * This file demonstrates ALL available configuration options for the
 * nuxt-crouton-collection-generator. Copy this file to `crouton.config.js`
 * and customize for your project.
 *
 * Usage:
 *   npx crouton-generate config ./crouton.config.js
 *   npx crouton-generate config ./crouton.config.js --only products
 *   npx crouton-generate --config ./crouton.config.js
 *
 * @see https://crouton.fyit.nl/generation/multi-collection
 * @see https://crouton.fyit.nl/generation/cli-reference
 */

export default {
  // ============================================================
  // DATABASE DIALECT
  // ============================================================
  // Required: 'pg' (PostgreSQL) or 'sqlite'
  // Affects generated schema types and query syntax
  dialect: 'sqlite',

  // ============================================================
  // COLLECTIONS DEFINITION (Enhanced Format - Recommended)
  // ============================================================
  // Define each collection with its own schema file.
  // This is the recommended approach for production projects.
  collections: [
    // Basic collection
    {
      name: 'products',                           // Collection name (plural, kebab-case recommended)
      fieldsFile: './schemas/products.json'       // Path to JSON schema file
    },

    // Collection with hierarchy support (tree structure)
    // Adds: parentId, path, depth, order fields
    // Generates: move & reorder API endpoints
    {
      name: 'categories',
      fieldsFile: './schemas/categories.json',
      hierarchy: true                             // Enable tree/nested structure
    },

    // Collection for pages with hierarchy
    {
      name: 'pages',
      fieldsFile: './schemas/pages.json',
      hierarchy: true
    },

    // Collection with sortable support (drag-and-drop reordering)
    // Adds: order field
    // Generates: reorder API endpoint
    {
      name: 'slides',
      fieldsFile: './schemas/slides.json',
      sortable: true                            // Enable drag-to-reorder (without hierarchy)
    },

    // Simple collections
    {
      name: 'authors',
      fieldsFile: './schemas/authors.json'
    },
    {
      name: 'posts',
      fieldsFile: './schemas/posts.json'
    },
    {
      name: 'orders',
      fieldsFile: './schemas/orders.json'
    },
    {
      name: 'tags',
      fieldsFile: './schemas/tags.json'
    }
  ],

  // ============================================================
  // TRANSLATIONS CONFIGURATION (i18n)
  // ============================================================
  // Define which fields are translatable per collection.
  // Translatable fields are moved to a translations JSON object
  // and rendered with CroutonI18nInput for per-language editing.
  //
  // When translations are configured:
  // 1. Fields listed here get CroutonI18nInput in forms
  // 2. Data is stored as: { translations: { en: {...}, nl: {...} } }
  // 3. The i18n layer is auto-added to nuxt.config.ts
  // 4. Locale files are created in layers/[layer]/i18n/locales/
  translations: {
    collections: {
      // Products: translate name and description per language
      products: ['name', 'description'],

      // Categories: translate name only
      categories: ['name', 'description'],

      // Posts: translate title, content, and excerpt
      posts: ['title', 'content', 'excerpt'],

      // Pages: full content translation
      pages: ['title', 'content', 'metaTitle', 'metaDescription']
    }
  },

  // ============================================================
  // TARGETS (Layer Organization)
  // ============================================================
  // Organize collections into domain-driven layers.
  // Each layer becomes a Nuxt layer in layers/[layer]/
  targets: [
    {
      layer: 'shop',                              // Layer name (creates layers/shop/)
      collections: ['products', 'categories', 'orders']  // Collections from above
    },
    {
      layer: 'content',
      collections: ['pages', 'posts', 'authors', 'tags', 'slides']
    }
  ],

  // ============================================================
  // EXTERNAL CONNECTORS
  // ============================================================
  // Configure connectors for :referenced collections (e.g., :users, :teams)
  // These are external collections from auth systems like SuperSaaS, Supabase, Clerk
  //
  // When your schema has refTarget: ':users', the generator will:
  // 1. Detect the external reference
  // 2. Look for connector config here
  // 3. Auto-setup or prompt based on autoConnectors flag
  connectors: {
    // SuperSaaS users connector
    users: {
      type: 'supersaas',                          // Connector type: 'supersaas' | 'supabase' | 'clerk'
      autoInstall: true,                          // Install @friendlyinternet/nuxt-crouton-supersaas
      copyFiles: true,                            // Copy connector files to project
      updateAppConfig: true                       // Auto-register in app.config.ts
    },

    // Example: Teams connector (if needed)
    // teams: {
    //   type: 'supersaas',
    //   autoInstall: true,
    //   copyFiles: true,
    //   updateAppConfig: true
    // }
  },

  // ============================================================
  // FLAGS (Generation Behavior)
  // ============================================================
  flags: {
    // --------------------------------------------------------
    // AUTO-GENERATED FIELDS
    // --------------------------------------------------------

    /**
     * useTeamUtility: Enable team-based multi-tenancy
     *
     * When true, automatically adds to ALL collections:
     * - teamId (required, text) - Team/organization reference
     * - userId (required, text) - User who created the record
     *
     * Also generates simplified API endpoints with team-based auth.
     *
     * WARNING: Do NOT define teamId or userId in your schema JSON
     * when this is true - they're auto-generated.
     *
     * @default false
     */
    useTeamUtility: false,

    /**
     * useMetadata: Add timestamp and audit fields
     *
     * When true, automatically adds to ALL collections:
     * - createdAt (timestamp) - When record was created
     * - updatedAt (timestamp) - When record was last modified
     * - updatedBy (text) - User ID who last modified
     *
     * WARNING: Do NOT define these fields in your schema JSON
     * when this is true - they're auto-generated.
     *
     * @default true
     */
    useMetadata: true,

    // --------------------------------------------------------
    // GENERATION BEHAVIOR
    // --------------------------------------------------------

    /**
     * autoRelations: Generate relation helper comments
     *
     * Adds commented relation stubs in generated schemas
     * to help set up Drizzle relations manually.
     *
     * @default false
     */
    autoRelations: false,

    /**
     * noTranslations: Skip translation field generation
     *
     * When true, skips generating i18n-related code.
     * Use if you don't need multi-language support.
     *
     * @default false
     */
    noTranslations: false,

    /**
     * force: Overwrite existing files
     *
     * When true, regenerates and overwrites all files
     * without prompting. Use with caution!
     *
     * @default false
     */
    force: false,

    /**
     * noDb: Skip database table creation
     *
     * When true, generates code but doesn't create/update
     * database tables. Useful for code-only regeneration.
     *
     * @default false
     */
    noDb: false,

    /**
     * dryRun: Preview without creating files
     *
     * When true, shows what would be generated without
     * actually creating any files. Always use this first!
     *
     * @default false
     */
    dryRun: false,

    // --------------------------------------------------------
    // CONNECTOR BEHAVIOR
    // --------------------------------------------------------

    /**
     * autoConnectors: Auto-configure connectors without prompting
     *
     * When true: Uses the `connectors` config above automatically
     * When false: Prompts interactively when external refs detected
     *
     * @default false
     */
    autoConnectors: false
  },

  // ============================================================
  // LEGACY FORMAT (Simple/Single Schema)
  // ============================================================
  // Alternative format when all collections share the same schema.
  // NOT recommended for production - use `collections[]` instead.
  //
  // schemaPath: './crouton-schema.json',  // Single schema file
  // targets: [
  //   { layer: 'shop', collections: ['products'] }
  // ]
}

// ============================================================
// EXAMPLE SCHEMA FILES
// ============================================================
//
// Below are example schema JSON files that work with this config.
// Create these in a ./schemas/ directory.
//
// --- schemas/products.json ---
// {
//   "name": {
//     "type": "string",
//     "meta": {
//       "required": true,
//       "label": "Product Name",
//       "maxLength": 200,
//       "area": "main"
//     }
//   },
//   "description": {
//     "type": "text",
//     "meta": {
//       "label": "Description",
//       "area": "main"
//     }
//   },
//   "price": {
//     "type": "decimal",
//     "meta": {
//       "required": true,
//       "label": "Price",
//       "default": 0,
//       "area": "sidebar"
//     }
//   },
//   "categoryId": {
//     "type": "string",
//     "refTarget": "categories",
//     "meta": {
//       "label": "Category",
//       "area": "sidebar"
//     }
//   },
//   "inStock": {
//     "type": "boolean",
//     "meta": {
//       "default": true,
//       "label": "In Stock",
//       "area": "sidebar"
//     }
//   },
//   "publishedAt": {
//     "type": "date",
//     "meta": {
//       "label": "Publish Date",
//       "area": "meta"
//     }
//   },
//   "priceTiers": {
//     "type": "repeater",
//     "meta": {
//       "label": "Volume Pricing",
//       "repeaterComponent": "PriceTier",
//       "addLabel": "Add Tier",
//       "sortable": true,
//       "area": "main"
//     }
//   }
// }
//
// --- schemas/categories.json (with hierarchy) ---
// {
//   "name": {
//     "type": "string",
//     "meta": {
//       "required": true,
//       "label": "Category Name"
//     }
//   },
//   "description": {
//     "type": "text",
//     "meta": {
//       "label": "Description"
//     }
//   },
//   "slug": {
//     "type": "string",
//     "meta": {
//       "required": true,
//       "label": "URL Slug"
//     }
//   }
// }
// Note: parentId, path, depth, order are auto-added when hierarchy: true
//
// --- schemas/posts.json (with external reference) ---
// {
//   "title": {
//     "type": "string",
//     "meta": {
//       "required": true,
//       "label": "Title"
//     }
//   },
//   "content": {
//     "type": "text",
//     "meta": {
//       "label": "Content"
//     }
//   },
//   "authorId": {
//     "type": "string",
//     "refTarget": ":users",
//     "meta": {
//       "required": true,
//       "label": "Author",
//       "readOnly": true
//     }
//   },
//   "categoryId": {
//     "type": "string",
//     "refTarget": "categories",
//     "meta": {
//       "label": "Category"
//     }
//   },
//   "status": {
//     "type": "string",
//     "meta": {
//       "default": "draft",
//       "label": "Status"
//     }
//   }
// }
// Note: :users prefix references external users collection (triggers connector)
//
// ============================================================
// FIELD TYPE REFERENCE
// ============================================================
//
// | Type     | Zod             | TypeScript        | Default  | Input Component    |
// |----------|-----------------|-------------------|----------|-------------------|
// | string   | z.string()      | string            | ''       | UInput            |
// | text     | z.string()      | string            | ''       | UTextarea         |
// | number   | z.number()      | number            | 0        | UInput[number]    |
// | decimal  | z.number()      | number            | 0        | UInput[number]    |
// | boolean  | z.boolean()     | boolean           | false    | USwitch           |
// | date     | z.date()        | Date | null       | null     | CroutonCalendar   |
// | json     | z.record()      | Record<string,any>| {}       | UTextarea[JSON]   |
// | repeater | z.array()       | any[]             | []       | CroutonRepeater   |
// | array    | z.array(z.string()) | string[]      | []       | (custom)          |
//
// ============================================================
// META PROPERTIES REFERENCE
// ============================================================
//
// | Property             | Type    | Description                                    |
// |----------------------|---------|------------------------------------------------|
// | required             | boolean | Field is required (adds Zod .min(1) or similar)|
// | label                | string  | Human-readable label for form fields           |
// | default              | any     | Default value for new records                  |
// | maxLength            | number  | Max string length (adds Zod .max())            |
// | area                 | string  | Form area: 'main' | 'sidebar' | 'meta'        |
// | readOnly             | boolean | Display as non-editable card                   |
// | component            | string  | Custom input component name                    |
// | repeaterComponent    | string  | Component for repeater items                   |
// | addLabel             | string  | Button text for adding repeater items          |
// | sortable             | boolean | Enable drag-to-reorder for repeaters           |
// | dependsOn            | string  | Field name this depends on                     |
// | dependsOnField       | string  | Field in referenced record to load             |
// | dependsOnCollection  | string  | Collection to fetch dependent data from        |
// | displayAs            | string  | Display mode: 'slotButtonGroup'               |
//
// ============================================================
// REFERENCE FIELDS
// ============================================================
//
// Basic reference (same layer):
// "categoryId": {
//   "type": "string",
//   "refTarget": "categories"
// }
// → Becomes: collection="shopCategories" (prefixed with layer)
//
// External reference (different layer or system):
// "authorId": {
//   "type": "string",
//   "refTarget": ":users"
// }
// → Becomes: collection="users" (no prefix, triggers connector)
//
// ============================================================
// CLI QUICK REFERENCE
// ============================================================
//
// Generate from config:
//   npx crouton-generate config
//   npx crouton-generate config ./crouton.config.js
//   npx crouton-generate config --only products
//   npx crouton-generate --config ./crouton.config.js
//
// Generate single collection:
//   npx crouton-generate shop products --fields-file=./schemas/products.json
//   npx crouton-generate shop products -f ./schemas/products.json --dialect=pg
//   npx crouton-generate content pages -f ./schemas/pages.json --hierarchy
//
// Preview changes:
//   npx crouton-generate config --dry-run
//   npx crouton-generate shop products -f ./schemas/products.json --dry-run
//
// Rollback:
//   npx crouton-generate rollback shop products
//   npx crouton-generate rollback shop products --dry-run
//   npx crouton-generate rollback-bulk --layer=shop
//   npx crouton-generate rollback-interactive
//
// Other commands:
//   npx crouton-generate init                    # Create example schema
//   npx crouton-generate add events              # Add event tracking layer
//   npx crouton-generate install                 # Install required modules