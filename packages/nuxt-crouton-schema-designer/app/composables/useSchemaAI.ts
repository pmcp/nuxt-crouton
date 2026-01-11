import { ref, watch, computed } from 'vue'
import type { SchemaField, FieldType, CollectionSchema, CollectionOptions } from '../types/schema'
import { FIELD_TYPES, META_PROPERTIES } from './useFieldTypes'
import { useSchemaDesigner } from './useSchemaDesigner'
import { useStreamingSchemaParser } from './useStreamingSchemaParser'

/**
 * Build the system prompt for schema generation
 * Supports both single and multi-collection generation
 */
function buildSystemPrompt(currentState: {
  layerName: string
  collections: CollectionSchema[]
}): string {
  const fieldTypesTable = FIELD_TYPES.map(ft =>
    `| ${ft.type} | ${ft.description} |`
  ).join('\n')

  const metaPropsTable = META_PROPERTIES.map(mp =>
    `| ${mp.key} | ${mp.type} | ${mp.description} |`
  ).join('\n')

  const currentCollectionsJson = currentState.collections.length > 0 && currentState.collections.some(c => c.fields.length > 0)
    ? `\n\nCurrent project state (existing collections in this project):\n\`\`\`json\n${JSON.stringify({
        layerName: currentState.layerName,
        collections: currentState.collections.map(c => ({
          collectionName: c.collectionName,
          fields: c.fields
        }))
      }, null, 2)}\n\`\`\``
    : ''

  return `You are a schema design assistant for Nuxt Crouton collections.

Your role:
1. Help users design database schemas for their applications
2. **Create multiple related collections** when the user asks for an "app", "system", or describes multiple entities
3. Ask 2-3 clarifying questions if requirements are vague
4. Generate valid JSON schemas with proper cross-collection references

## Available Field Types

| Type | Description |
|------|-------------|
${fieldTypesTable}

## Meta Properties (optional for each field)

| Property | Type | Description |
|----------|------|-------------|
${metaPropsTable}

## Output Format - IMPORTANT

**For a single collection**, output:
\`\`\`json
{
  "layerName": "shop",
  "collections": [
    {
      "collectionName": "products",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "title", "type": "string", "meta": { "required": true, "maxLength": 255 } },
        { "name": "price", "type": "decimal", "meta": { "precision": 10, "scale": 2 } }
      ],
      "options": { "sortable": true, "seed": true, "seedCount": 25 }
    }
  ]
}
\`\`\`

**For multiple collections** (e.g., "create an e-commerce app"):
\`\`\`json
{
  "layerName": "ecommerce",
  "collections": [
    {
      "collectionName": "products",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "title", "type": "string", "meta": { "required": true, "maxLength": 255 } },
        { "name": "description", "type": "text" },
        { "name": "price", "type": "decimal", "meta": { "precision": 10, "scale": 2, "required": true } },
        { "name": "categoryId", "type": "string", "meta": { "required": true }, "refTarget": "categories" }
      ],
      "options": { "sortable": true, "seed": true, "seedCount": 25 }
    },
    {
      "collectionName": "categories",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "name", "type": "string", "meta": { "required": true, "maxLength": 100 } },
        { "name": "slug", "type": "string", "meta": { "required": true, "unique": true } },
        { "name": "parentId", "type": "string", "refTarget": "categories" }
      ],
      "options": { "hierarchy": true, "seed": true, "seedCount": 10 }
    },
    {
      "collectionName": "orders",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "orderNumber", "type": "string", "meta": { "required": true, "unique": true } },
        { "name": "status", "type": "string", "meta": { "required": true } },
        { "name": "total", "type": "decimal", "meta": { "precision": 10, "scale": 2 } },
        { "name": "customerId", "type": "string", "meta": { "required": true }, "refTarget": "customers" },
        { "name": "items", "type": "json", "meta": { "label": "Order Items" } }
      ],
      "options": { "sortable": true, "seed": true, "seedCount": 50 }
    },
    {
      "collectionName": "customers",
      "fields": [
        { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
        { "name": "email", "type": "string", "meta": { "required": true, "unique": true } },
        { "name": "firstName", "type": "string", "meta": { "required": true, "maxLength": 100 } },
        { "name": "lastName", "type": "string", "meta": { "required": true, "maxLength": 100 } }
      ],
      "options": { "seed": true, "seedCount": 20 }
    }
  ]
}
\`\`\`

## When to Create Multiple Collections

Create MULTIPLE collections when the user says:
- "Create an app for..." / "Build a ... app"
- "Create a ... system" / "Build a ... platform"
- Mentions multiple entities like "products AND categories" or "users, posts, and comments"
- Asks for something that clearly involves relationships (e.g., "blog with comments")

Create a SINGLE collection when the user says:
- "Create a collection for..." / "Add a collection for..."
- "Create a ... table" / "I need a ... schema"
- Only mentions one entity

## Cross-Collection References

When collections are related, use the **refTarget** property:
\`\`\`json
{ "name": "categoryId", "type": "string", "refTarget": "categories" }
\`\`\`

This creates a foreign key reference to another collection.

## Rules

1. **Always include an 'id' field** with type 'uuid' and meta.primaryKey: true as the first field
2. **NEVER include timestamp or audit fields** - These are AUTO-GENERATED:
   - createdAt, updatedAt, createdBy, updatedBy - Do NOT add these
3. Use **camelCase** for field names (e.g., userId, productName)
4. Use **plural, camelCase** collection names (e.g., "products", "categories", "faqCategories")
5. Choose appropriate field types:
   - 'string' for short text (max 255 chars)
   - 'text' for long content
   - 'decimal' for money (precision: 10, scale: 2)
   - 'integer' for counts
   - 'boolean' for flags
   - 'date'/'datetime' for dates
   - 'json' for complex nested data
6. Mark important fields as required: true
7. Set maxLength for string fields
8. When modifying existing collections, output the FULL schema with all fields
${currentCollectionsJson}

## Conversation Style

- Be concise and helpful
- For app requests, generate all related collections immediately
- Explain your schema design choices briefly
- After generating, ask if the user wants any changes or additional collections`
}

/**
 * Extended SchemaField with AI animation tracking
 */
export interface SchemaFieldWithAI extends SchemaField {
  _isNew?: boolean
}

/**
 * useSchemaAI - AI-assisted schema creation composable
 *
 * Integrates AI chat with the schema designer for live-updating
 * schema generation as the AI streams its response.
 * Supports multi-collection generation for complete app scaffolding.
 */
export function useSchemaAI() {
  const designer = useSchemaDesigner()
  const parser = useStreamingSchemaParser()

  // Track AI-added fields for animation
  const aiAddedFieldIds = ref<Set<string>>(new Set())

  // Track which collections were created by AI (for animation)
  const aiCreatedCollectionIds = ref<Set<string>>(new Set())

  // Check if AI package is available
  const isAIAvailable = ref(false)

  // Chat state (will be populated if AI is available)
  const messages = ref<Array<{ id: string; role: 'user' | 'assistant' | 'system'; content: string }>>([])
  const input = ref('')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Internal chat instance
  let chatInstance: ReturnType<typeof useChat> | null = null

  /**
   * Initialize AI chat if the package is available
   */
  function initializeChat() {
    try {
      // @ts-expect-error - useChat may not be available if nuxt-crouton-ai isn't installed
      chatInstance = useChat({
        api: '/api/schema-designer/ai/chat',
        provider: 'anthropic',
        model: 'claude-sonnet-4-5-20250929',
        onFinish: (message: { content: string }) => {
          // Final sync when streaming completes
          syncFromAIResponse(message.content, true)
        }
      })

      isAIAvailable.value = true

      // Sync reactive state
      watch(
        () => chatInstance?.messages.value,
        (msgs) => {
          if (msgs) messages.value = [...msgs]
        },
        { immediate: true, deep: true }
      )

      watch(
        () => chatInstance?.input.value,
        (val) => {
          if (val !== undefined) input.value = val
        },
        { immediate: true }
      )

      watch(
        () => chatInstance?.isLoading.value,
        (val) => {
          if (val !== undefined) isLoading.value = val
        },
        { immediate: true }
      )

      watch(
        () => chatInstance?.error.value,
        (val) => {
          error.value = val || null
        },
        { immediate: true }
      )

      // Watch for streaming content to parse fields incrementally
      watch(
        () => messages.value.at(-1)?.content,
        (content) => {
          if (content && isLoading.value) {
            syncFromAIResponse(content, false)
          }
        }
      )
    } catch {
      // AI package not available
      isAIAvailable.value = false
    }
  }

  /**
   * Sync schema state from AI response
   * Handles both single-collection (legacy) and multi-collection responses
   */
  function syncFromAIResponse(content: string, isFinal: boolean) {
    // First, try to parse as multi-collection format
    const multiCollectionResult = parser.parseMultiCollectionContent(content)

    if (multiCollectionResult.collections.length > 0) {
      // Multi-collection response - sync all collections
      syncMultipleCollections(multiCollectionResult, isFinal)
      return
    }

    // Fallback to single-collection parsing (legacy)
    const newFields = parser.parseStreamingContent(content)

    for (const field of newFields) {
      // Check if field already exists (by name) in active collection
      const activeCollection = designer.activeCollection.value
      if (!activeCollection) continue

      const existingIndex = activeCollection.fields.findIndex((f: SchemaField) => f.name === field.name)

      if (existingIndex === -1) {
        // Add new field with animation flag
        activeCollection.fields.push(field)
        aiAddedFieldIds.value.add(field.id)

        // Clear animation after delay
        setTimeout(() => {
          aiAddedFieldIds.value.delete(field.id)
        }, 2500)
      } else {
        // Update existing field
        const existing = activeCollection.fields[existingIndex]
        if (existing) {
          activeCollection.fields[existingIndex] = {
            ...existing,
            type: field.type,
            meta: { ...existing.meta, ...field.meta },
            refTarget: field.refTarget
          }
        }
      }
    }

    // Parse metadata (collection name, layer name, options)
    const metadata = parser.parseStreamingMetadata(content)

    if (metadata.collectionName && designer.activeCollection.value && !designer.activeCollection.value.collectionName) {
      designer.activeCollection.value.collectionName = metadata.collectionName
    }

    if (metadata.layerName && !designer.multiState.value.layerName) {
      designer.multiState.value.layerName = metadata.layerName
    }

    if (metadata.options && isFinal && designer.activeCollection.value) {
      designer.activeCollection.value.options = {
        ...designer.activeCollection.value.options,
        ...metadata.options
      }
    }
  }

  /**
   * Sync multiple collections from AI response
   */
  function syncMultipleCollections(
    result: { layerName?: string; collections: Array<{ collectionName: string; fields: SchemaField[]; options?: Partial<CollectionOptions> }> },
    isFinal: boolean
  ) {
    // Set layer name if provided
    if (result.layerName && !designer.multiState.value.layerName) {
      designer.multiState.value.layerName = result.layerName
    }

    // Track if we've used the "replace empty first" option in this sync
    let replacedEmptyFirst = false
    // Track collection names we've processed in this sync call to avoid duplicates
    const processedCollectionNames = new Set<string>()

    for (const collectionData of result.collections) {
      if (!collectionData.collectionName) continue

      // Skip if we've already processed this collection name in this sync
      if (processedCollectionNames.has(collectionData.collectionName)) continue
      processedCollectionNames.add(collectionData.collectionName)

      // Find existing collection by name
      const existingCollection = designer.collections.value.find(
        (c: CollectionSchema) => c.collectionName === collectionData.collectionName
      )

      if (existingCollection) {
        // Update existing collection's fields
        for (const field of collectionData.fields) {
          const existingFieldIndex = existingCollection.fields.findIndex((f: SchemaField) => f.name === field.name)

          if (existingFieldIndex === -1) {
            existingCollection.fields.push(field)
            aiAddedFieldIds.value.add(field.id)

            setTimeout(() => {
              aiAddedFieldIds.value.delete(field.id)
            }, 2500)
          } else {
            const existing = existingCollection.fields[existingFieldIndex]
            if (existing) {
              existingCollection.fields[existingFieldIndex] = {
                ...existing,
                type: field.type,
                meta: { ...existing.meta, ...field.meta },
                refTarget: field.refTarget
              }
            }
          }
        }

        // Update options on final
        if (isFinal && collectionData.options) {
          existingCollection.options = {
            ...existingCollection.options,
            ...collectionData.options
          }
        }
      } else {
        // Create new collection
        // Check if this is the first (empty) collection - replace it instead of adding
        // Only do this ONCE per sync call
        const firstCollection = designer.collections.value[0]
        const isFirstCollectionEmpty = !replacedEmptyFirst &&
          designer.collections.value.length === 1 &&
          !firstCollection?.collectionName &&
          firstCollection?.fields.length === 0

        if (isFirstCollectionEmpty && firstCollection) {
          // Replace the empty first collection
          replacedEmptyFirst = true
          firstCollection.collectionName = collectionData.collectionName
          // Use spread to create new array for reactivity
          firstCollection.fields = [...collectionData.fields]
          if (collectionData.options) {
            firstCollection.options = {
              ...firstCollection.options,
              ...collectionData.options
            }
          }

          // Mark fields for animation
          for (const field of collectionData.fields) {
            aiAddedFieldIds.value.add(field.id)
            setTimeout(() => {
              aiAddedFieldIds.value.delete(field.id)
            }, 2500)
          }

          aiCreatedCollectionIds.value.add(firstCollection.id)
          setTimeout(() => {
            aiCreatedCollectionIds.value.delete(firstCollection.id)
          }, 3000)
        } else {
          // Add as new collection
          const newCollectionId = designer.addCollection(collectionData.collectionName)

          // Find the newly created collection and populate it
          const newCollection = designer.collections.value.find((c: CollectionSchema) => c.id === newCollectionId)
          if (newCollection) {
            // Use spread to create new array for reactivity
            newCollection.fields = [...collectionData.fields]

            if (collectionData.options) {
              newCollection.options = {
                ...newCollection.options,
                ...collectionData.options
              }
            }

            // Mark fields for animation
            for (const field of collectionData.fields) {
              aiAddedFieldIds.value.add(field.id)
              setTimeout(() => {
                aiAddedFieldIds.value.delete(field.id)
              }, 2500)
            }

            aiCreatedCollectionIds.value.add(newCollectionId)
            setTimeout(() => {
              aiCreatedCollectionIds.value.delete(newCollectionId)
            }, 3000)
          }
        }
      }
    }

    // After adding all collections, select the first one
    if (isFinal && result.collections.length > 0) {
      const firstCollectionName = result.collections[0]?.collectionName
      const firstCollection = designer.collections.value.find((c: CollectionSchema) => c.collectionName === firstCollectionName)
      if (firstCollection) {
        designer.setActiveCollection(firstCollection.id)
      }
    }
  }

  /**
   * Send a message to the AI
   */
  async function sendMessage(messageText?: string) {
    if (!chatInstance) return

    const text = messageText || input.value
    if (!text.trim()) return

    // Reset parser for new conversation turn
    parser.reset()

    // Build system prompt with current multi-collection state
    const systemPrompt = buildSystemPrompt({
      layerName: designer.multiState.value.layerName,
      collections: designer.collections.value
    })

    // Update input if provided
    if (messageText) {
      chatInstance.input.value = messageText
    }

    // Submit with system prompt in body
    await chatInstance.handleSubmit(undefined, {
      body: {
        systemPrompt
      }
    })
  }

  /**
   * Check if a field was recently added by AI (for animation)
   */
  function isFieldFromAI(fieldId: string): boolean {
    return aiAddedFieldIds.value.has(fieldId)
  }

  /**
   * Check if a collection was recently created by AI (for animation)
   */
  function isCollectionFromAI(collectionId: string): boolean {
    return aiCreatedCollectionIds.value.has(collectionId)
  }

  /**
   * Clear the chat history
   */
  function clearChat() {
    if (chatInstance) {
      chatInstance.setMessages([])
    }
    messages.value = []
    parser.reset()
  }

  /**
   * Manually trigger a schema suggestion
   */
  async function suggestSchema(description: string) {
    await sendMessage(`Create a schema for: ${description}`)
  }

  /**
   * Manually trigger an app generation
   */
  async function suggestApp(description: string) {
    await sendMessage(`Create an app for: ${description}`)
  }

  // Initialize immediately in setup context (composables must be called synchronously)
  initializeChat()

  return {
    // State
    messages,
    input,
    isLoading,
    error,
    isAIAvailable,
    aiAddedFieldIds,
    aiCreatedCollectionIds,

    // Methods
    sendMessage,
    clearChat,
    suggestSchema,
    suggestApp,
    isFieldFromAI,
    isCollectionFromAI,

    // For v-model binding on input
    updateInput: (value: string) => {
      input.value = value
      if (chatInstance) {
        chatInstance.input.value = value
      }
    }
  }
}
