/**
 * @crouton-studio
 * Composable for Studio chat with artifact extraction
 *
 * Wraps useChat() from crouton-ai with:
 * - App context in system prompt
 * - Artifact parsing from AI responses
 * - Artifact state management
 */

import type { StudioArtifact, StudioMessage, ParsedArtifact, ArtifactType, ArtifactStatus } from '../types/studio'

interface UseStudioChatOptions {
  /** Custom system prompt additions */
  systemPromptAddition?: string
  /** Initial messages */
  initialMessages?: StudioMessage[]
  /** Callback when an artifact is extracted */
  onArtifact?: (artifact: StudioArtifact) => void
}

/**
 * Parse artifact blocks from AI response content
 *
 * Looks for blocks like:
 * ```artifact:collection:tasks
 * { "name": "tasks", "fields": [...] }
 * ```
 *
 * or
 *
 * ```artifact:component:TasksCard
 * <script setup>...</script>
 * ```
 */
function parseArtifacts(content: string): ParsedArtifact[] {
  const artifacts: ParsedArtifact[] = []

  // Match ```artifact:type:name blocks
  const artifactRegex = /```artifact:(\w+):(\w+)\n([\s\S]*?)```/g
  let match

  while ((match = artifactRegex.exec(content)) !== null) {
    const [, type, name, artifactContent] = match

    // Validate artifact type
    const validTypes = ['collection', 'component', 'page', 'composable']
    if (validTypes.includes(type)) {
      artifacts.push({
        type: type as ArtifactType,
        name,
        content: artifactContent.trim(),
        language: type === 'collection' ? 'json' : 'vue'
      })
    }
  }

  return artifacts
}

/**
 * Remove artifact blocks from content for display
 */
function stripArtifactBlocks(content: string): string {
  return content.replace(/```artifact:\w+:\w+\n[\s\S]*?```/g, '').trim()
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Build the system prompt with app context
 */
function buildSystemPrompt(appContext: string, addition?: string): string {
  const basePrompt = `You are Crouton Studio, an AI assistant for building Nuxt applications.

${appContext}

## Your Capabilities

1. **Design collection schemas** - Create JSON schemas for new collections
2. **Generate collections** - Describe schemas that can be used with crouton CLI
3. **Adapt components** - Enhance generated components with better UX
4. **Create pages** - Design page layouts using collection blocks

## Output Format

When creating artifacts, use this format:

\`\`\`artifact:collection:collectionName
{
  "name": "collectionName",
  "label": "Collection Label",
  "fields": [
    { "name": "fieldName", "type": "string", "label": "Field Label" }
  ]
}
\`\`\`

\`\`\`artifact:component:ComponentName
<script setup lang="ts">
// Vue component code using Composition API
</script>

<template>
  <!-- Template here -->
</template>
\`\`\`

The developer will see these as cards they can review and apply.

## Guidelines

- Always use TypeScript with \`<script setup lang="ts">\`
- Use Nuxt UI 4 components (UButton, UInput, UModal, etc.)
- Keep schemas simple and focused
- Explain what you're creating before the artifact block
- One artifact per response unless multiple are clearly related`

  return addition ? `${basePrompt}\n\n${addition}` : basePrompt
}

/**
 * Studio chat composable with artifact extraction
 */
export function useStudioChat(options: UseStudioChatOptions = {}) {
  // Get app scanner for context
  const { buildAIContext, context: appContext, scan } = useAppScanner()

  // State
  const messages = ref<StudioMessage[]>(options.initialMessages || [])
  const artifacts = ref<StudioArtifact[]>([])
  const input = ref('')
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // Build system prompt with current app context
  const systemPrompt = computed(() => {
    const aiContext = buildAIContext()
    return buildSystemPrompt(aiContext, options.systemPromptAddition)
  })

  // Initialize chat from crouton-ai with system prompt in body
  const chat = useChat({
    api: '/api/ai/chat',
    body: {
      systemPrompt: systemPrompt.value
    },
    onFinish: (message) => {
      // Parse artifacts from response
      const parsed = parseArtifacts(message.content)

      // Create artifact objects
      const newArtifacts: StudioArtifact[] = parsed.map(p => ({
        id: generateId(),
        type: p.type,
        name: p.name,
        path: getArtifactPath(p.type, p.name),
        content: p.content,
        status: 'pending' as ArtifactStatus,
        createdAt: new Date()
      }))

      // Add to artifacts list
      if (newArtifacts.length > 0) {
        artifacts.value = [...artifacts.value, ...newArtifacts]

        // Notify via callback
        newArtifacts.forEach(a => options.onArtifact?.(a))
      }

      // Update the last message with artifacts and cleaned content
      const lastIdx = messages.value.length - 1
      if (lastIdx >= 0 && messages.value[lastIdx].role === 'assistant') {
        messages.value[lastIdx] = {
          ...messages.value[lastIdx],
          content: stripArtifactBlocks(message.content),
          artifacts: newArtifacts.length > 0 ? newArtifacts : undefined
        }
      }
    },
    onError: (err) => {
      error.value = err
      isLoading.value = false
    }
  })

  /**
   * Get default path for an artifact
   */
  function getArtifactPath(type: ArtifactType, name: string): string {
    switch (type) {
      case 'collection':
        return `layers/[layer]/collections/${name}/`
      case 'component':
        return `app/components/${name}.vue`
      case 'page':
        return `app/pages/${name}.vue`
      case 'composable':
        return `app/composables/use${name}.ts`
      default:
        return `${name}`
    }
  }

  /**
   * Send a message
   */
  async function send(content?: string) {
    const messageContent = content || input.value
    if (!messageContent.trim()) return

    error.value = null
    isLoading.value = true

    // Add user message to our messages
    const userMessage: StudioMessage = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      createdAt: new Date()
    }
    messages.value = [...messages.value, userMessage]

    // Clear input
    input.value = ''

    try {
      // Add placeholder assistant message
      const assistantMessage: StudioMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        createdAt: new Date()
      }
      messages.value = [...messages.value, assistantMessage]

      // Send to AI via chat composable
      chat.input.value = messageContent
      await chat.handleSubmit()

      // Update the assistant message with response
      const lastAIMessage = chat.messages.value[chat.messages.value.length - 1]
      if (lastAIMessage && lastAIMessage.role === 'assistant') {
        const lastIdx = messages.value.length - 1
        messages.value[lastIdx] = {
          ...messages.value[lastIdx],
          content: lastAIMessage.content
        }
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to send message')
      // Remove the placeholder assistant message on error
      messages.value = messages.value.slice(0, -1)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Update artifact status
   */
  function updateArtifactStatus(id: string, status: ArtifactStatus) {
    const idx = artifacts.value.findIndex(a => a.id === id)
    if (idx !== -1) {
      artifacts.value[idx] = { ...artifacts.value[idx], status }
    }
  }

  /**
   * Get artifact by ID
   */
  function getArtifact(id: string): StudioArtifact | undefined {
    return artifacts.value.find(a => a.id === id)
  }

  /**
   * Clear all messages and artifacts
   */
  function clear() {
    messages.value = []
    artifacts.value = []
    chat.clearMessages()
  }

  /**
   * Ensure app context is loaded
   */
  async function ensureContext() {
    if (!appContext.value) {
      await scan()
    }
  }

  return {
    // State
    messages: readonly(messages),
    artifacts: readonly(artifacts),
    input,
    isLoading: readonly(isLoading),
    error: readonly(error),
    systemPrompt,

    // Methods
    send,
    clear,
    updateArtifactStatus,
    getArtifact,
    ensureContext,

    // Expose underlying chat for advanced use
    chat
  }
}
