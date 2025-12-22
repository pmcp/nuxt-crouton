import { ref, watch, computed, onMounted } from 'vue'
import type { SchemaField, FieldType } from '../types/schema'
import { FIELD_TYPES, META_PROPERTIES } from './useFieldTypes'
import { useSchemaDesigner } from './useSchemaDesigner'
import { useStreamingSchemaParser } from './useStreamingSchemaParser'

/**
 * Build the system prompt for schema generation
 * Includes field types reference and current schema state
 */
function buildSystemPrompt(currentState: { collectionName: string; layerName: string; fields: SchemaField[] }): string {
  const fieldTypesTable = FIELD_TYPES.map(ft =>
    `| ${ft.type} | ${ft.description} |`
  ).join('\n')

  const metaPropsTable = META_PROPERTIES.map(mp =>
    `| ${mp.key} | ${mp.type} | ${mp.description} |`
  ).join('\n')

  const currentStateJson = currentState.fields.length > 0
    ? `\n\nCurrent schema state (user can edit this, your changes should build on it):\n\`\`\`json\n${JSON.stringify(currentState, null, 2)}\n\`\`\``
    : ''

  return `You are a schema design assistant for Nuxt Crouton collections.

Your role:
1. Help users design database schemas for their collections
2. Ask 2-3 clarifying questions if requirements are vague
3. Generate valid JSON schemas when you have enough information
4. Suggest appropriate field types based on the data being stored

## Available Field Types

| Type | Description |
|------|-------------|
${fieldTypesTable}

## Meta Properties (optional for each field)

| Property | Type | Description |
|----------|------|-------------|
${metaPropsTable}

## Output Format

When generating a schema, output valid JSON in this exact format:

\`\`\`json
{
  "collectionName": "products",
  "layerName": "shop",
  "fields": [
    { "name": "id", "type": "uuid", "meta": { "primaryKey": true } },
    { "name": "title", "type": "string", "meta": { "required": true, "maxLength": 255 } },
    { "name": "description", "type": "text" },
    { "name": "price", "type": "decimal", "meta": { "precision": 10, "scale": 2, "required": true } }
  ],
  "options": {
    "hierarchy": false,
    "sortable": true,
    "translatable": false,
    "seed": true,
    "seedCount": 25
  }
}
\`\`\`

## Rules

1. **Always include an 'id' field** with type 'uuid' and meta.primaryKey: true as the first field
2. Use **camelCase** for field names (e.g., createdAt, userId, productName)
3. Choose the most appropriate field type for the data:
   - 'string' for short text (names, titles) - max 255 chars
   - 'text' for long content (descriptions, body)
   - 'decimal' for money/prices (with precision: 10, scale: 2)
   - 'integer' for counts, quantities
   - 'boolean' for yes/no flags
   - 'date' for dates without time, 'datetime' for timestamps
   - 'json' for complex nested data
   - 'array' for simple string lists
4. Mark important fields as required: true
5. Set appropriate maxLength for string fields
6. If the user wants to modify existing fields, output the FULL schema with all fields (existing + modified)
7. When adding fields to an existing schema, output ALL fields including the existing ones
${currentStateJson}

## Conversation Style

- Be concise and helpful
- Ask clarifying questions if the requirements are unclear
- When generating, explain your field type choices briefly
- After generating, ask if the user wants any changes`
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
 */
export function useSchemaAI() {
  const designer = useSchemaDesigner()
  const parser = useStreamingSchemaParser()

  // Track AI-added fields for animation
  const aiAddedFieldIds = ref<Set<string>>(new Set())

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
        model: 'claude-sonnet-4-5-20241022',
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
   */
  function syncFromAIResponse(content: string, isFinal: boolean) {
    // Parse streaming fields
    const newFields = parser.parseStreamingContent(content)

    for (const field of newFields) {
      // Check if field already exists (by name)
      const existingIndex = designer.state.value.fields.findIndex(f => f.name === field.name)

      if (existingIndex === -1) {
        // Add new field with animation flag
        designer.state.value.fields.push(field)
        aiAddedFieldIds.value.add(field.id)

        // Clear animation after delay
        setTimeout(() => {
          aiAddedFieldIds.value.delete(field.id)
        }, 2500)
      } else {
        // Update existing field
        const existing = designer.state.value.fields[existingIndex]
        if (existing) {
          designer.state.value.fields[existingIndex] = {
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

    if (metadata.collectionName && !designer.state.value.collectionName) {
      designer.state.value.collectionName = metadata.collectionName
    }

    if (metadata.layerName && !designer.state.value.layerName) {
      designer.state.value.layerName = metadata.layerName
    }

    if (metadata.options && isFinal) {
      designer.state.value.options = {
        ...designer.state.value.options,
        ...metadata.options
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

    // Build system prompt with current state
    const systemPrompt = buildSystemPrompt({
      collectionName: designer.state.value.collectionName,
      layerName: designer.state.value.layerName,
      fields: designer.state.value.fields
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

  // Initialize on mount
  onMounted(() => {
    initializeChat()
  })

  return {
    // State
    messages,
    input,
    isLoading,
    error,
    isAIAvailable,
    aiAddedFieldIds,

    // Methods
    sendMessage,
    clearChat,
    suggestSchema,
    isFieldFromAI,

    // For v-model binding on input
    updateInput: (value: string) => {
      input.value = value
      if (chatInstance) {
        chatInstance.input.value = value
      }
    }
  }
}
