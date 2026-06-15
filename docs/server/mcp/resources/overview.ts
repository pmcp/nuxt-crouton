export default defineMcpResource({
  uri: 'crouton://overview',
  name: 'Nuxt Crouton Overview',
  description: 'Overview of Nuxt Crouton - a CRUD generator for Nuxt applications',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://overview',
        mimeType: 'text/markdown',
        text: `# Nuxt Crouton

Nuxt Crouton is a powerful code generator that creates complete CRUD (Create, Read, Update, Delete) applications for Nuxt in seconds.

## What It Does

- **Generates complete CRUD layers** from simple schema definitions
- **Creates Vue components** for forms, tables, and modals
- **Generates API endpoints** with full CRUD operations
- **Creates composables** for data fetching and mutations
- **Supports relations** between collections
- **Integrates with Drizzle ORM** for database operations

## Key Concepts

### Collections
A collection is a data entity (like "users", "posts", "products"). Each collection gets:
- Database table/schema
- API endpoints (GET, POST, PUT, DELETE)
- Vue components (Form, Table, Modal)
- Composables (useUsers, useUser, etc.)

### Schemas
Define your data structure in a simple JSON/YAML schema:
\`\`\`yaml
name: products
fields:
  - name: title
    type: string
    required: true
  - name: price
    type: number
  - name: category
    type: select
    options: [Electronics, Clothing, Books]
\`\`\`

### Layers
Generated code is organized into Nuxt layers for modularity. Each layer contains all code for a domain.

## Getting Started

1. Install Crouton in your Nuxt project
2. Define your collection schema
3. Run the generator: \`pnpm crouton generate\`
4. Use the generated components and composables

## Documentation Sections

- **Getting Started**: Installation and basic usage
- **Fundamentals**: Core concepts and architecture
- **Generation**: Schema format and CLI commands
- **Patterns**: Common patterns for forms, tables, relations
- **Customization**: Customize generated components
- **Features**: i18n, assets, maps, flow, AI integration
- **Advanced**: Team auth, conditional fields, bulk operations
- **API Reference**: Composables, components, types
- **Guides**: Best practices, troubleshooting, migration
`
      }]
    }
  }
})
