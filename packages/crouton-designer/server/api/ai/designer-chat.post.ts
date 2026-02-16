import { streamText, tool } from 'ai'
// Use zod/v3 compat layer — the AI SDK's tool() relies on zod-to-json-schema
// which doesn't support Zod 4, producing empty schemas that Anthropic rejects
import { z } from 'zod/v3'

const fieldTypeEnum = z.enum([
  'string', 'text', 'number', 'decimal', 'boolean',
  'date', 'datetime', 'uuid', 'integer',
  'json', 'repeater', 'array', 'reference',
  'image', 'file'
])

const fieldMetaSchema = z.object({
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  label: z.string().optional(),
  area: z.enum(['main', 'sidebar', 'meta']).optional(),
  maxLength: z.number().optional(),
  default: z.any().optional(),
  translatable: z.boolean().optional(),
  group: z.string().optional(),
  displayAs: z.string().optional(),
  options: z.array(z.string()).optional(),
  optionsCollection: z.string().optional(),
  optionsField: z.string().optional(),
  readOnly: z.boolean().optional(),
  primaryKey: z.boolean().optional(),
  dependsOn: z.string().optional(),
  dependsOnCollection: z.string().optional(),
  dependsOnField: z.string().optional()
}).optional().describe('Field metadata')

// Phase 1 tools
function getPhase1Tools() {
  return {
    set_app_config: tool({
      description: 'Set or update the app configuration. Call this whenever the user provides information about their app. Partial updates merge with existing values — only include fields you want to change.',
      parameters: z.object({
        name: z.string().optional().describe('App name'),
        description: z.string().optional().describe('Short description of what the app does'),
        appType: z.enum(['saas', 'cms', 'internal-tool', 'marketplace', 'social', 'ecommerce', 'other']).optional().describe('Type of application'),
        multiTenant: z.boolean().optional().describe('Whether the app supports multiple teams/organizations'),
        authType: z.enum(['email-password', 'oauth', 'both']).optional().describe('Authentication method'),
        languages: z.array(z.string()).optional().describe('Supported languages as ISO codes (e.g. ["en", "nl", "fr"])'),
        defaultLocale: z.string().optional().describe('Default language ISO code'),
        packages: z.array(z.string()).optional().describe('Crouton packages to include (e.g. ["crouton-editor", "crouton-i18n"])')
      }),
      execute: async (args) => ({ success: true, ...args })
    })
  }
}

const displayConfigSchema = z.object({
  title: z.string().optional().describe('Field name used as the primary display title'),
  subtitle: z.string().optional().describe('Field name for secondary context'),
  image: z.string().optional().describe('Field name for the visual identifier (image/file type)'),
  badge: z.string().optional().describe('Field name for status/category badge'),
  description: z.string().optional().describe('Field name for summary text')
}).optional().describe('Display config — which fields serve which display roles')

// Phase 3 tools
function getPhase3Tools() {
  return {
    set_seed_data: tool({
      description: 'Replace the full seed dataset for a single collection. Call this once per collection. Entries should have a synthetic _id field for cross-referencing between collections.',
      parameters: z.object({
        collectionName: z.string().describe('The collection name to set seed data for'),
        entries: z.array(z.record(z.any())).describe('Array of seed data entries. Each must include an _id string field for cross-referencing.')
      }),
      execute: async (args) => ({ success: true, action: 'set_seed_data', ...args })
    })
  }
}

// Phase 2 tools
function getPhase2Tools() {
  return {
    create_collection: tool({
      description: 'Create a new collection (entity/table) with optional initial fields. Use this to propose complete collections efficiently.',
      parameters: z.object({
        name: z.string().describe('Collection name (e.g. "Tasks", "Projects")'),
        description: z.string().optional().describe('Description of what this collection stores'),
        display: displayConfigSchema,
        fields: z.array(z.object({
          name: z.string().describe('Field name in camelCase'),
          type: fieldTypeEnum.describe('Field type'),
          meta: fieldMetaSchema,
          refTarget: z.string().optional().describe('Target collection name for reference fields')
        })).optional().describe('Initial fields to create with the collection')
      }),
      execute: async (args) => ({ success: true, action: 'create_collection', ...args })
    }),

    update_collection: tool({
      description: 'Rename or update a collection\'s description or display config.',
      parameters: z.object({
        collectionId: z.string().describe('The collection ID to update'),
        name: z.string().optional().describe('New collection name'),
        description: z.string().optional().describe('New description'),
        display: displayConfigSchema
      }),
      execute: async (args) => ({ success: true, action: 'update_collection', ...args })
    }),

    delete_collection: tool({
      description: 'Delete a collection and all its fields.',
      parameters: z.object({
        collectionId: z.string().describe('The collection ID to delete')
      }),
      execute: async (args) => ({ success: true, action: 'delete_collection', ...args })
    }),

    add_field: tool({
      description: 'Add a field to an existing collection.',
      parameters: z.object({
        collectionId: z.string().describe('The collection ID to add the field to'),
        name: z.string().describe('Field name in camelCase'),
        type: fieldTypeEnum.describe('Field type'),
        meta: fieldMetaSchema,
        refTarget: z.string().optional().describe('Target collection name for reference fields')
      }),
      execute: async (args) => ({ success: true, action: 'add_field', ...args })
    }),

    update_field: tool({
      description: 'Update an existing field\'s name, type, meta, or reference target.',
      parameters: z.object({
        fieldId: z.string().describe('The field ID to update'),
        name: z.string().optional().describe('New field name'),
        type: fieldTypeEnum.optional().describe('New field type'),
        meta: fieldMetaSchema,
        refTarget: z.string().optional().describe('New reference target collection name')
      }),
      execute: async (args) => ({ success: true, action: 'update_field', ...args })
    }),

    delete_field: tool({
      description: 'Delete a field from a collection.',
      parameters: z.object({
        fieldId: z.string().describe('The field ID to delete')
      }),
      execute: async (args) => ({ success: true, action: 'delete_field', ...args })
    }),

    reorder_fields: tool({
      description: 'Set the display order of fields within a collection.',
      parameters: z.object({
        collectionId: z.string().describe('The collection ID'),
        fieldIds: z.array(z.string()).describe('Field IDs in the desired order')
      }),
      execute: async (args) => ({ success: true, action: 'reorder_fields', ...args })
    })
  }
}

export default defineEventHandler(async (event) => {
  const { messages, system, provider, model, phase } = await readBody(event)

  const ai = createAIProvider(event)
  const modelId = model || ai.getDefaultModel()

  const tools = phase === '3' ? getPhase3Tools() : phase === '2' ? getPhase2Tools() : getPhase1Tools()

  const result = streamText({
    model: ai.model(modelId),
    system,
    messages,
    tools,
    maxSteps: 5
  })

  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      if (error instanceof Error) {
        console.error('[designer-chat] AI error:', error.message)
        return error.message
      }
      return 'An unknown error occurred'
    }
  })
})
