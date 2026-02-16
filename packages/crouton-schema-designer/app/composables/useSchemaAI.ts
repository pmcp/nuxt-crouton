import { ref, watch, computed } from 'vue'
import type { SchemaField, FieldType, FieldMeta, CollectionSchema, CollectionOptions } from '../types/schema'
import type { PackageManifest, PackageCollection, PackageSchemaField } from '../types/package-manifest'
import { FIELD_TYPES, META_PROPERTIES } from './useFieldTypes'
import { useSchemaDesigner } from './useSchemaDesigner'
import { usePackageRegistry } from './usePackageRegistry'
import { useStreamingSchemaParser } from './useStreamingSchemaParser'
import type { AIPackageSuggestion } from './useStreamingSchemaParser'

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

  // Package context for AI to recommend appropriate packages
  const packageContext = `
## Available Crouton Packages

You can recommend these packages when appropriate. **Packages provide pre-built functionality** that saves time compared to creating custom collections.

| Package | Use When | Collections Included |
|---------|----------|---------------------|
| crouton-bookings | User mentions: bookings, appointments, reservations, scheduling, calendar, slots, availability, courts, rooms, rentals, equipment booking | bookings, locations, settings, emailTemplates (opt-in), emailLogs (opt-in) |
| crouton-sales | User mentions: sales, POS, point of sale, orders, products, events, markets, pop-up shop, retail, checkout, receipts, invoices | events, products, categories, orders, orderItems, locations, clients, eventSettings, printers (opt-in), printQueues (opt-in) |

### Package Details

**crouton-bookings** - Slot-based and inventory booking system
- Perfect for: Tennis courts, meeting rooms, appointments, equipment rentals
- Features: Time slot management, availability checking, booking cart, email notifications (opt-in)
- Layer name: \`bookings\` (fixed)
- **Optional features to ask about:**
  - Email notifications (booking confirmations, reminders) - enables emailTemplates and emailLogs collections

**crouton-sales** - Event-based Point of Sale system
- Perfect for: Pop-up events, markets, food sales, temporary retail
- Features: Product catalog, categories, order management, thermal receipt printing (opt-in)
- Layer name: \`sales\` (fixed)
- **Optional features to ask about:**
  - Thermal receipt printing - enables printers and printQueues collections

## When to Suggest Packages

1. **Analyze user intent** - Look for keywords that match package purposes
2. **Suggest package first** - If a package covers 70%+ of the use case, recommend it
3. **ASK ABOUT OPTIONAL FEATURES** - When recommending a package, always ask about its optional features
4. **Create custom collections** - For anything packages don't cover
5. **Combine both** - Often users need packages + custom collections

## IMPORTANT: Ask About Optional Features

When you suggest a package, **always ask the user about optional features**. For example:

For crouton-bookings:
"I recommend the **crouton-bookings** package for your booking system. Do you want to enable **email notifications** for booking confirmations and reminders? (This adds emailTemplates and emailLogs collections)"

For crouton-sales:
"I recommend the **crouton-sales** package for your POS system. Do you need **thermal receipt printing** support? (This adds printers and printQueues collections)"

Include the user's answer in the \`packages\` array with a \`configuration\` object:

\`\`\`json
{
  "packageId": "crouton-bookings",
  "reason": "For appointment scheduling and availability management",
  "configuration": {
    "email.enabled": true
  }
}
\`\`\`

## Package vs Custom Collection Decision

- **Use package** when: Domain matches well (bookings, POS), features align, time-to-value matters
- **Use custom** when: Unique business logic, package doesn't fit, full control needed

`

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
2. **Recommend packages** when they fit the user's needs (bookings, sales/POS)
3. **Create custom collections** for anything packages don't cover
4. Generate valid JSON schemas with proper cross-collection references

## Available Field Types

| Type | Description |
|------|-------------|
${fieldTypesTable}

## Meta Properties (optional for each field)

| Property | Type | Description |
|----------|------|-------------|
${metaPropsTable}

${packageContext}

## Output Format - IMPORTANT

**Always output this structure:**

\`\`\`json
{
  "projectName": "My App Name",
  "baseLayerName": "myApp",
  "packages": [
    {
      "packageId": "crouton-bookings",
      "reason": "For appointment scheduling and availability management"
    }
  ],
  "collections": [
    {
      "collectionName": "staff",
      "fields": [
        { "name": "name", "type": "string", "meta": { "required": true } },
        { "name": "email", "type": "string", "meta": { "required": true } }
      ],
      "options": { "seed": true, "seedCount": 10 }
    }
  ]
}
\`\`\`

### Output Fields

- **projectName**: Human-readable name (e.g., "Tennis Club Manager")
- **baseLayerName**: camelCase layer name for custom collections (e.g., "tennisClub")
- **packages**: Array of recommended packages (can be empty if none fit)
- **collections**: Array of custom collections (can be empty if packages cover everything)

### Example: Tennis Club App (Package + Custom)

\`\`\`json
{
  "projectName": "Tennis Club Manager",
  "baseLayerName": "tennisClub",
  "packages": [
    {
      "packageId": "crouton-bookings",
      "reason": "For court reservations with time slots and availability"
    }
  ],
  "collections": [
    {
      "collectionName": "members",
      "fields": [
        { "name": "name", "type": "string", "meta": { "required": true, "maxLength": 255 } },
        { "name": "email", "type": "string", "meta": { "required": true } },
        { "name": "membershipLevel", "type": "string", "meta": { "required": true } },
        { "name": "joinDate", "type": "date", "meta": { "required": true } }
      ],
      "options": { "seed": true, "seedCount": 50 }
    },
    {
      "collectionName": "tournaments",
      "fields": [
        { "name": "name", "type": "string", "meta": { "required": true } },
        { "name": "startDate", "type": "date", "meta": { "required": true } },
        { "name": "endDate", "type": "date" },
        { "name": "maxParticipants", "type": "integer" }
      ],
      "options": { "seed": true, "seedCount": 5 }
    }
  ]
}
\`\`\`

### Example: Blog (Custom Collections Only)

\`\`\`json
{
  "projectName": "My Blog",
  "baseLayerName": "blog",
  "packages": [],
  "collections": [
    {
      "collectionName": "posts",
      "fields": [
        { "name": "title", "type": "string", "meta": { "required": true, "maxLength": 255 } },
        { "name": "content", "type": "text", "meta": { "required": true } },
        { "name": "published", "type": "boolean", "meta": { "default": false } }
      ]
    },
    {
      "collectionName": "categories",
      "fields": [
        { "name": "name", "type": "string", "meta": { "required": true } },
        { "name": "slug", "type": "string", "meta": { "required": true, "unique": true } }
      ]
    }
  ]
}
\`\`\`

### Example: Food Festival (Package Only)

\`\`\`json
{
  "projectName": "Food Festival POS",
  "baseLayerName": "festival",
  "packages": [
    {
      "packageId": "crouton-sales",
      "reason": "Complete POS system with products, categories, and orders"
    }
  ],
  "collections": []
}
\`\`\`

## When to Recommend Packages vs Custom Collections

**Recommend crouton-bookings when:**
- User mentions: bookings, appointments, reservations, scheduling, courts, rooms, rentals
- Examples: "tennis club", "meeting room booking", "appointment scheduler", "equipment rental"

**Recommend crouton-sales when:**
- User mentions: sales, POS, point of sale, orders, products, events, markets, retail
- Examples: "food truck", "pop-up shop", "event sales", "market stall"

**Create custom collections when:**
- The domain doesn't match any package (blogs, CRM, inventory management, etc.)
- User explicitly wants custom control
- Package covers most needs but user needs additional entities

**Combine both when:**
- Package covers core functionality + user needs additional features
- Example: "Tennis club with member management" → bookings package + members collection

## Cross-Collection References

When collections are related, use the **refTarget** property:
\`\`\`json
{ "name": "categoryId", "type": "string", "refTarget": "categories" }
\`\`\`

This creates a foreign key reference to another collection.

## Rules

1. **NEVER include auto-generated fields** - These are added automatically by Crouton:
   - id, teamId, createdAt, updatedAt, createdBy, updatedBy - Do NOT add ANY of these
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
9. **Always output JSON with projectName, baseLayerName, packages, and collections arrays**
${currentCollectionsJson}

## Conversation Style

- Be concise and helpful
- **Always explain why you're recommending (or not recommending) a package**
- For app requests, generate JSON immediately
- Describe what the package provides if you recommend one
- Ask if the user wants any changes after generating`
}

/** Fields auto-generated by Crouton — silently strip from AI output */
const AUTO_GENERATED_FIELDS = new Set(['id', 'teamId', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'])

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
 * Now also supports package suggestions from AI.
 */
export function useSchemaAI() {
  const designer = useSchemaDesigner()
  const packageRegistry = usePackageRegistry()
  const parser = useStreamingSchemaParser()

  // Track AI-added fields for animation
  const aiAddedFieldIds = ref<Set<string>>(new Set())

  // Track which collections were created by AI (for animation)
  const aiCreatedCollectionIds = ref<Set<string>>(new Set())

  // Track AI-suggested packages with reasons
  const aiSuggestedPackages = ref<AIPackageSuggestion[]>([])

  // Track AI-suggested project metadata
  const aiProjectName = ref<string>('')
  const aiBaseLayerName = ref<string>('')

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
      // useChat may not be available if nuxt-crouton-ai isn't installed
      // The try/catch handles this at runtime
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
   * Handles the new project suggestion format with packages, and legacy formats
   */
  function syncFromAIResponse(content: string, isFinal: boolean) {
    // First, try to parse as new project suggestion format (with packages)
    const projectSuggestion = parser.parseProjectSuggestion(content)

    // Check if this is a new format response (has packages or projectName or baseLayerName)
    const hasNewFormatData = projectSuggestion.packages.length > 0 ||
      projectSuggestion.projectName ||
      projectSuggestion.baseLayerName ||
      projectSuggestion.collections.length > 0

    if (hasNewFormatData) {
      // Sync project metadata
      if (projectSuggestion.projectName) {
        aiProjectName.value = projectSuggestion.projectName
      }
      if (projectSuggestion.baseLayerName) {
        aiBaseLayerName.value = projectSuggestion.baseLayerName
        // Also set in designer for backward compatibility
        if (!designer.multiState.value.layerName) {
          designer.multiState.value.layerName = projectSuggestion.baseLayerName
        }
      }

      // Sync packages - update the list of AI-suggested packages
      if (projectSuggestion.packages.length > 0) {
        // Merge new packages, avoiding duplicates
        for (const pkg of projectSuggestion.packages) {
          const existingIdx = aiSuggestedPackages.value.findIndex(p => p.packageId === pkg.packageId)
          if (existingIdx === -1) {
            aiSuggestedPackages.value.push(pkg)
          } else {
            // Update reason if changed
            aiSuggestedPackages.value[existingIdx] = pkg
          }
        }
      }

      // Sync collections if present
      if (projectSuggestion.collections.length > 0) {
        syncMultipleCollections({
          layerName: projectSuggestion.baseLayerName,
          collections: projectSuggestion.collections
        }, isFinal)
      }

      return
    }

    // Fallback: try to parse as legacy multi-collection format
    const multiCollectionResult = parser.parseMultiCollectionContent(content)

    if (multiCollectionResult.collections.length > 0) {
      // Multi-collection response - sync all collections
      syncMultipleCollections(multiCollectionResult, isFinal)
      return
    }

    // Fallback to single-collection parsing (legacy)
    const newFields = parser.parseStreamingContent(content)
      .filter(f => !AUTO_GENERATED_FIELDS.has(f.name))

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

      // Filter out auto-generated fields from AI output
      collectionData.fields = collectionData.fields.filter(f => !AUTO_GENERATED_FIELDS.has(f.name))

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
   * Clear the chat history and AI suggestions
   */
  function clearChat() {
    if (chatInstance) {
      chatInstance.setMessages([])
    }
    messages.value = []
    parser.reset()
    // Also clear AI suggestions
    clearAISuggestions()
  }

  /**
   * Clear only AI suggestions (packages, project metadata) without clearing chat
   */
  function clearAISuggestions() {
    aiSuggestedPackages.value = []
    aiProjectName.value = ''
    aiBaseLayerName.value = ''
  }

  /**
   * Remove a specific package from AI suggestions
   */
  function removeAISuggestedPackage(packageId: string) {
    const idx = aiSuggestedPackages.value.findIndex(p => p.packageId === packageId)
    if (idx !== -1) {
      aiSuggestedPackages.value.splice(idx, 1)
    }
  }

  /**
   * Convert a package schema field to a SchemaField with locked flag
   */
  function convertPackageField(
    name: string,
    field: PackageSchemaField,
    packageId: string
  ): SchemaField {
    return {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      type: field.type as FieldType,
      meta: (field.meta || {}) as FieldMeta,
      refTarget: field.refTarget,
      locked: true,
      fromPackage: packageId
    }
  }

  /**
   * Convert a package collection to a CollectionSchema with locked fields
   */
  function convertPackageCollection(
    collection: PackageCollection,
    packageId: string
  ): CollectionSchema {
    const fields: SchemaField[] = []

    // Convert schema fields (handle both object and array formats)
    if (collection.schema) {
      for (const [fieldName, fieldDef] of Object.entries(collection.schema)) {
        fields.push(convertPackageField(fieldName, fieldDef, packageId))
      }
    }

    return {
      id: `collection-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      collectionName: collection.name,
      fields,
      options: {
        hierarchy: false,
        sortable: false,
        translatable: false,
        seed: false,
        seedCount: 25
      },
      fromPackage: packageId,
      packageTableName: collection.tableName,
      packageDescription: collection.description
    }
  }

  /**
   * Evaluate a condition string against configuration.
   * Supports conditions like "config.email.enabled"
   */
  function evaluateCondition(condition: string, config: Record<string, unknown>): boolean {
    const match = condition.match(/^config\.(.+)$/)
    if (!match) return true

    const configPath = match[1]
    if (!configPath) return true

    const value = config[configPath]
    return Boolean(value)
  }

  /**
   * Check if a collection should be imported based on its optional status and condition.
   */
  function shouldImportCollection(
    collection: PackageCollection,
    config: Record<string, unknown>
  ): boolean {
    // Always import non-optional collections
    if (!collection.optional) return true

    // For optional collections, check the condition
    if (collection.condition) {
      return evaluateCondition(collection.condition, config)
    }

    // Optional without condition - import by default
    return true
  }

  /**
   * Import collections from a package manifest into the designer.
   * Fields from the package are marked as locked.
   * Optional collections are imported based on their conditions and the provided config.
   */
  async function importPackageCollections(
    packageId: string,
    config: Record<string, unknown> = {}
  ): Promise<boolean> {
    const manifest = await packageRegistry.getPackage(packageId)
    if (!manifest) {
      console.error(`Failed to load manifest for package ${packageId}`)
      return false
    }

    // Track if this is the first collection we're adding (for empty state replacement)
    let replacedEmptyFirst = false

    // Import each collection from the package
    for (const pkgCollection of manifest.collections) {
      // Check if this collection should be imported based on config
      if (!shouldImportCollection(pkgCollection, config)) {
        continue
      }

      // Check if collection already exists
      const existingCollection = designer.collections.value.find(
        (c: CollectionSchema) => c.collectionName === pkgCollection.name && c.fromPackage === packageId
      )

      if (existingCollection) {
        // Collection already imported, skip
        continue
      }

      // Convert and add the collection
      const newCollection = convertPackageCollection(pkgCollection, packageId)

      // Check if we should replace an empty first collection
      const firstCollection = designer.collections.value[0]
      const isFirstCollectionEmpty = !replacedEmptyFirst &&
        designer.collections.value.length === 1 &&
        !firstCollection?.collectionName &&
        firstCollection?.fields.length === 0

      if (isFirstCollectionEmpty && firstCollection) {
        // Replace the empty first collection with our package collection
        replacedEmptyFirst = true
        Object.assign(firstCollection, newCollection)
        aiCreatedCollectionIds.value.add(firstCollection.id)
      } else {
        // Add as new collection
        designer.multiState.value.collections.push(newCollection)
        aiCreatedCollectionIds.value.add(newCollection.id)
      }

      // Animation cleanup
      setTimeout(() => {
        aiCreatedCollectionIds.value.delete(newCollection.id)
      }, 3000)

      // Mark fields for animation
      for (const field of newCollection.fields) {
        aiAddedFieldIds.value.add(field.id)
        setTimeout(() => {
          aiAddedFieldIds.value.delete(field.id)
        }, 2500)
      }
    }

    // Select the first imported collection
    const firstImported = designer.collections.value.find(
      (c: CollectionSchema) => c.fromPackage === packageId
    )
    if (firstImported) {
      designer.setActiveCollection(firstImported.id)
    }

    return true
  }

  /**
   * Sync optional collections for a package when configuration changes.
   * Adds collections that are now enabled, removes collections that are now disabled.
   */
  async function syncPackageCollections(
    packageId: string,
    config: Record<string, unknown>
  ): Promise<void> {
    const manifest = await packageRegistry.getPackage(packageId)
    if (!manifest) return

    for (const pkgCollection of manifest.collections) {
      // Only process optional collections
      if (!pkgCollection.optional) continue

      const shouldBeImported = shouldImportCollection(pkgCollection, config)
      const existingCollection = designer.collections.value.find(
        (c: CollectionSchema) => c.collectionName === pkgCollection.name && c.fromPackage === packageId
      )

      if (shouldBeImported && !existingCollection) {
        // Collection should be imported but isn't - add it
        const newCollection = convertPackageCollection(pkgCollection, packageId)
        designer.multiState.value.collections.push(newCollection)
        aiCreatedCollectionIds.value.add(newCollection.id)

        setTimeout(() => {
          aiCreatedCollectionIds.value.delete(newCollection.id)
        }, 3000)

        for (const field of newCollection.fields) {
          aiAddedFieldIds.value.add(field.id)
          setTimeout(() => {
            aiAddedFieldIds.value.delete(field.id)
          }, 2500)
        }
      } else if (!shouldBeImported && existingCollection) {
        // Collection shouldn't be imported but is - remove it
        designer.multiState.value.collections = designer.multiState.value.collections.filter(
          (c: CollectionSchema) => c.id !== existingCollection.id
        )
      }
    }
  }

  /**
   * Remove all collections from a specific package
   */
  function removePackageCollections(packageId: string) {
    designer.multiState.value.collections = designer.multiState.value.collections.filter(
      (c: CollectionSchema) => c.fromPackage !== packageId
    )

    // Select a remaining collection if needed
    if (designer.collections.value.length > 0 && !designer.activeCollection.value) {
      designer.setActiveCollection(designer.collections.value[0]!.id)
    }
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

    // AI-suggested packages and project metadata
    aiSuggestedPackages,
    aiProjectName,
    aiBaseLayerName,

    // Methods
    sendMessage,
    clearChat,
    clearAISuggestions,
    removeAISuggestedPackage,
    suggestSchema,
    suggestApp,
    isFieldFromAI,
    isCollectionFromAI,

    // Package import methods
    importPackageCollections,
    removePackageCollections,
    syncPackageCollections,

    // For v-model binding on input
    updateInput: (value: string) => {
      input.value = value
      if (chatInstance) {
        chatInstance.input.value = value
      }
    }
  }
}
