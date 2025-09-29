// Example configuration for generating a products collection
// This matches your test-product-schema.json file

export default {
  // Path to your JSON schema file
  schemaPath: './test-product-schema.json',

  // Database dialect: 'pg' or 'sqlite'
  dialect: 'sqlite',

  // Target layers and collections to generate
  targets: [
    {
      layer: 'shop',
      collections: ['products']
    }
  ],

  // Flags matching your command:
  // npx crouton-generate shop products --fields-file=./crouton-schema.json --no-translations --force
  flags: {
    noTranslations: true,  // --no-translations
    force: true,           // --force
    noDb: false,          // Include database generation
    useMetadata: true,     // Include createdAt/updatedAt fields
    autoRelations: false,  // Don't generate relation stubs
    dryRun: false,        // Actually create the files
    useTeamUtility: false, // No team utility
    retries: 0
  }
}

// Usage:
// npx crouton-generate --config ./crouton.config.products.js
// OR
// npx crouton-generate config ./crouton.config.products.js