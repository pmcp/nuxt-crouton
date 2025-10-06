// Configuration demonstrating EditorSimple rich text editor integration
// This config shows how to use the meta.component field to specify custom components

export default {
  // Define collections with their schema files
  collections: [
    // Article collection with EditorSimple for rich text content
    { name: 'articles', fieldsFile: './FilesForTesting/schemas/article-with-editor-schema.json' },

    // Regular blog posts for comparison
    { name: 'posts', fieldsFile: './FilesForTesting/schemas/post-schema.json' },

    // Shop collections
    { name: 'products', fieldsFile: './FilesForTesting/schemas/product-schema.json' },
  ],

  // Specify which collections go in which layers
  targets: [
    {
      layer: 'blog',
      collections: ['articles', 'posts']
    },
    {
      layer: 'shop',
      collections: ['products']
    }
  ],

  // Translation configuration
  // Note: You can use translations WITH EditorSimple - they work together!
  translations: {
    collections: {
      articles: ['title', 'excerpt'],  // content uses EditorSimple, not translations
      posts: ['title', 'content', 'excerpt']
    }
  },

  // Database configuration
  dialect: 'sqlite',

  // Flags
  flags: {
    noTranslations: false,  // Include translation support
    force: true,            // Overwrite existing files
    noDb: false,           // Create database tables
    dryRun: false,         // Actually create files
    autoRelations: true,   // Generate relation stubs
    useTeamUtility: true,  // Enable team-based authentication
    useMetadata: true      // Include timestamps
  }
}

// How this works:
//
// 1. In article-with-editor-schema.json, the "content" field has:
//    "meta": {
//      "component": "EditorSimple"  // ← This tells the generator to use EditorSimple
//    }
//
// 2. The generator will create:
//    <UFormField label="Content" name="content">
//      <EditorSimple v-model="state.content" />
//    </UFormField>
//
// 3. Instead of a plain textarea:
//    <UFormField label="Content" name="content">
//      <UTextarea v-model="state.content" />
//    </UFormField>
//
// 4. The module detector will:
//    - Detect that EditorSimple is being used
//    - Check if @friendlyinternet/nuxt-crouton-editor is installed
//    - Prompt you to install it if missing
//
// Usage:
// npx crouton-generate config ./FilesForTesting/crouton.config.multi-schema-with-editor.js
//
// The generated form for 'articles' will use:
// - Regular UInput for title and slug
// - UTextarea for excerpt (type: text without component specified)
// - EditorSimple for content (type: text WITH component: "EditorSimple")
// - CroutonI18nInput for translatable fields (title, excerpt)
//
// This demonstrates the flexibility of the meta.component approach:
// - You can mix regular fields and custom components
// - You can use EditorSimple for some text fields but not others
// - Translations and custom components work together