/**
 * CLI Commands Reference Resource
 * Synced with: packages/nuxt-crouton-cli/bin/crouton-generate.js
 */
export default defineMcpResource({
  uri: 'crouton://cli-commands',
  name: 'Crouton CLI Commands Reference',
  description: 'Complete reference of all Crouton CLI commands and options',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://cli-commands',
        mimeType: 'text/markdown',
        text: `# Crouton CLI Reference

## Commands

### Generate Collection
\`\`\`bash
crouton <layer> <collection> [options]
\`\`\`

Generate a single collection into a layer.

**Arguments:**
- \`layer\` - Target layer name (e.g., "shop", "blog", "admin")
- \`collection\` - Collection name (e.g., "products", "posts")

**Options:**
| Option | Description |
|--------|-------------|
| \`--fields-file <path>\` | Path to schema JSON file |
| \`--dialect <pg\\|sqlite>\` | Database dialect (default: pg) |
| \`--hierarchy\` | Enable tree structure (adds parentId, path, depth, order) |
| \`--force\` | Overwrite existing files |
| \`--no-translations\` | Skip i18n fields |
| \`--dry-run\` | Preview without writing files |

**Examples:**
\`\`\`bash
# Basic generation
crouton shop products --fields-file=./schemas/products.json

# With SQLite dialect
crouton shop products --fields-file=./schemas/products.json --dialect=sqlite

# With hierarchy support
crouton content categories --fields-file=./schemas/categories.json --hierarchy

# Dry run to preview
crouton shop products --fields-file=./schemas/products.json --dry-run
\`\`\`

---

### Generate from Config
\`\`\`bash
crouton config [path] [options]
\`\`\`

Generate multiple collections from a config file.

**Arguments:**
- \`path\` - Path to config file (default: ./crouton.config.js)

**Options:**
| Option | Description |
|--------|-------------|
| \`--only <name>\` | Generate only specified collection |

**Examples:**
\`\`\`bash
# Generate all from default config
crouton config

# Generate from specific config
crouton config ./configs/my-config.js

# Generate only one collection
crouton config --only products
\`\`\`

**Config File Format:**
\`\`\`javascript
// crouton.config.js
export default {
  dialect: 'sqlite',
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json' },
    { name: 'categories', fieldsFile: './schemas/categories.json', hierarchy: true }
  ],
  targets: [
    { layer: 'shop', collections: ['products', 'categories'] }
  ],
  flags: {
    noTranslations: false,
    force: false
  }
}
\`\`\`

---

### Install Modules
\`\`\`bash
crouton install
\`\`\`

Install required Nuxt modules and dependencies for Crouton.

---

### Initialize Schema
\`\`\`bash
crouton init [options]
\`\`\`

Create an example schema file to get started.

**Options:**
| Option | Description |
|--------|-------------|
| \`-o, --output <path>\` | Output path for schema file |

**Example:**
\`\`\`bash
crouton init -o ./schemas/example.json
\`\`\`

---

### Rollback Collection
\`\`\`bash
crouton rollback <layer> <collection>
\`\`\`

Remove a generated collection and its files.

**Arguments:**
- \`layer\` - Layer containing the collection
- \`collection\` - Collection to remove

**Example:**
\`\`\`bash
crouton rollback shop products
\`\`\`

---

### Interactive Rollback
\`\`\`bash
crouton rollback-interactive
\`\`\`

Interactive UI for selecting and removing collections.

---

### Seed Translations
\`\`\`bash
crouton seed-translations
\`\`\`

Seed i18n translation data for generated collections.

---

## Generated Output Structure

When you generate a collection, Crouton creates:

\`\`\`
layers/[layer]/collections/[collection]/
├── app/
│   ├── components/
│   │   ├── Form.vue          # CRUD form with Zod validation
│   │   └── List.vue          # Data table component
│   └── composables/
│       └── use[Collection].ts # Data fetching composable
├── server/
│   ├── api/teams/[id]/[layer]-[collection]/
│   │   ├── index.get.ts      # List items
│   │   ├── index.post.ts     # Create item
│   │   ├── [id].patch.ts     # Update item
│   │   └── [id].delete.ts    # Delete item
│   └── database/
│       ├── schema.ts         # Drizzle schema
│       └── queries.ts        # Query functions
├── types.ts                  # TypeScript interfaces
└── nuxt.config.ts           # Layer config
\`\`\`

## Tips

1. **Start with dry-run**: Always use \`--dry-run\` first to preview changes
2. **Use config for multiple**: For projects with many collections, use config files
3. **SQLite for dev**: Use \`--dialect=sqlite\` for local development
4. **Rollback before regenerate**: If you need to change a schema, rollback first
`
      }]
    }
  }
})
