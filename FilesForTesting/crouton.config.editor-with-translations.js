// ADVANCED: EditorSimple rich text editor WITH multi-language translations
// This demonstrates the powerful combination of custom components + i18n

export default {
  // Collections
  collections: [
    {
      name: 'articles',
      fieldsFile: './FilesForTesting/schemas/article-with-editor-and-translations-schema.json'
    }
  ],

  // Target layers
  targets: [
    {
      layer: 'blog',
      collections: ['articles']
    }
  ],

  // Translation configuration
  // KEY FEATURE: Mark fields with custom components as translatable!
  translations: {
    collections: {
      articles: [
        'title',      // Regular UInput per language
        'excerpt',    // Regular UTextarea per language
        'content'     // EditorSimple per language! 🎉
      ]
    }
  },

  // Database configuration
  dialect: 'sqlite',

  // Flags
  flags: {
    noTranslations: false,  // MUST be false to enable translations
    force: true,
    noDb: false,
    dryRun: false,
    autoRelations: true,
    useTeamUtility: true,
    useMetadata: true
  }
}

// ═══════════════════════════════════════════════════════════════
// How This Works:
// ═══════════════════════════════════════════════════════════════
//
// 1. In the schema, "content" field has:
//    "meta": {
//      "component": "EditorSimple"
//    }
//
// 2. In the config, "content" is marked as translatable:
//    translations: {
//      collections: {
//        articles: ['title', 'excerpt', 'content']
//      }
//    }
//
// 3. The generator creates:
//    <TranslationsInput
//      v-model="state.translations"
//      :fields="['title', 'excerpt', 'content']"
//      :field-components="{
//        content: 'EditorSimple'
//      }"
//    />
//
// 4. TranslationsInput component renders:
//    - EN tab:
//      - Title: <UInput> (English)
//      - Excerpt: <UTextarea> (English)
//      - Content: <EditorSimple> (English) ← Rich text!
//
//    - NL tab:
//      - Title: <UInput> (Dutch)
//      - Excerpt: <UTextarea> (Dutch)
//      - Content: <EditorSimple> (Dutch) ← Rich text!
//
//    - FR tab:
//      - Title: <UInput> (French)
//      - Excerpt: <UTextarea> (French)
//      - Content: <EditorSimple> (French) ← Rich text!
//
// 5. Data structure saved to database:
//    {
//      translations: {
//        en: {
//          title: "My Article",
//          excerpt: "This is...",
//          content: "<p>Rich <strong>HTML</strong> content</p>"
//        },
//        nl: {
//          title: "Mijn Artikel",
//          excerpt: "Dit is...",
//          content: "<p>Rijke <strong>HTML</strong> inhoud</p>"
//        },
//        fr: {
//          title: "Mon Article",
//          excerpt: "Ceci est...",
//          content: "<p>Contenu <strong>HTML</strong> riche</p>"
//        }
//      }
//    }
//
// ═══════════════════════════════════════════════════════════════
// Benefits:
// ═══════════════════════════════════════════════════════════════
// ✅ Rich text editing per language (no more plain textareas!)
// ✅ Visual WYSIWYG editor for all translations
// ✅ Consistent formatting across languages
// ✅ Works with ANY custom component, not just EditorSimple
// ✅ Backwards compatible (fields without component use UInput)
//
// ═══════════════════════════════════════════════════════════════
// Usage:
// ═══════════════════════════════════════════════════════════════
// npx crouton-generate config ./FilesForTesting/crouton.config.editor-with-translations.js
//
// Make sure you have both packages installed:
// pnpm add @friendlyinternet/nuxt-crouton-i18n
// pnpm add @friendlyinternet/nuxt-crouton-editor
//
// And add them to nuxt.config.ts extends:
// extends: [
//   '@friendlyinternet/nuxt-crouton',
//   '@friendlyinternet/nuxt-crouton-i18n',
//   '@friendlyinternet/nuxt-crouton-editor'
// ]
