import { z } from 'zod'

export const cliHelpInputSchema = {
  command: z.enum(['generate', 'config', 'rollback', 'init', 'install', 'all']).optional().describe('Specific command to get help for, or "all" for complete reference')
}

export const cliHelpToolDefinition = {
  name: 'cli_help',
  description: 'Get help and usage information for Crouton CLI commands'
}

const HELP_CONTENT: Record<string, string> = {
  generate: `## crouton generate

Generate a new CRUD collection.

**Usage:**
\`\`\`bash
crouton generate <layer> <collection> [options]
\`\`\`

**Arguments:**
- \`layer\` - Target layer name (e.g., "shop", "blog")
- \`collection\` - Collection name (e.g., "products", "posts")

**Options:**
| Option | Description |
|--------|-------------|
| \`--fields-file <path>\` | Path to schema JSON file |
| \`--dialect <pg\\|sqlite>\` | Database dialect (default: pg) |
| \`--hierarchy\` | Enable tree structure |
| \`--force\` | Overwrite existing files |
| \`--no-translations\` | Skip i18n fields |
| \`--dry-run\` | Preview without writing |

**Example:**
\`\`\`bash
crouton generate shop products --fields-file=./schemas/products.json --dialect=sqlite
\`\`\``,

  config: `## crouton config

Generate collections from a config file.

**Usage:**
\`\`\`bash
crouton config [path] [options]
\`\`\`

**Arguments:**
- \`path\` - Path to config file (default: ./crouton.config.js)

**Options:**
| Option | Description |
|--------|-------------|
| \`--only <name>\` | Generate only specified collection |

**Config File Format:**
\`\`\`javascript
export default {
  dialect: 'sqlite',
  collections: [
    { name: 'products', fieldsFile: './schemas/products.json' }
  ],
  targets: [
    { layer: 'shop', collections: ['products'] }
  ]
}
\`\`\``,

  rollback: `## crouton rollback

Remove a generated collection.

**Usage:**
\`\`\`bash
crouton rollback <layer> <collection>
\`\`\`

**Arguments:**
- \`layer\` - Layer containing the collection
- \`collection\` - Collection to remove

**Related commands:**
- \`crouton rollback-interactive\` - Interactive selection UI
- \`crouton rollback-bulk\` - Bulk operations`,

  init: `## crouton init

Create an example schema file to get started.

**Usage:**
\`\`\`bash
crouton init [options]
\`\`\`

**Options:**
| Option | Description |
|--------|-------------|
| \`-o, --output <path>\` | Output path for schema file |`,

  install: `## crouton install

Install required Nuxt modules and dependencies.

**Usage:**
\`\`\`bash
crouton install
\`\`\`

Installs all required packages for Crouton to work.`,

  all: `# Crouton CLI Reference

## Commands

| Command | Description |
|---------|-------------|
| \`generate\` | Generate a new collection |
| \`config\` | Generate from config file |
| \`rollback\` | Remove a collection |
| \`rollback-interactive\` | Interactive removal UI |
| \`init\` | Create example schema |
| \`install\` | Install dependencies |
| \`seed-translations\` | Seed i18n data |

## Quick Examples

\`\`\`bash
# Generate a collection
crouton generate shop products --fields-file=./products.json

# Generate from config
crouton config ./crouton.config.js

# Preview before generating
crouton generate shop products --fields-file=./products.json --dry-run

# Remove a collection
crouton rollback shop products
\`\`\`

Use \`cli_help\` with a specific command for detailed options.`
}

export function handleCliHelp(args: { command?: string }): { help: string } {
  const command = args.command || 'all'
  const help = HELP_CONTENT[command]

  if (!help) {
    return {
      help: `Unknown command: ${command}. Available: ${Object.keys(HELP_CONTENT).join(', ')}`
    }
  }

  return { help }
}
