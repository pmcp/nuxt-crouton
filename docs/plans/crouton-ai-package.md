# @crouton/ai Package Implementation Plan

> **Goal**: Create a minimal Nuxt layer package that provides AI integration (chat, streaming, multi-provider) for crouton apps, using Vercel AI SDK as the foundation.

## Quick Stats

| Metric | Value |
|--------|-------|
| **Tasks Completed** | 9 / 18 |
| **Current Phase** | Phase 3: Composables ✅ |
| **Estimated Total** | ~12-16 hours |

---

## Executive Summary

### What We're Building

`@crouton/ai` is a Nuxt layer that wraps [Vercel AI SDK](https://ai-sdk.dev/) to provide:

1. **Multi-Provider Support** - OpenAI, Anthropic Claude, Google, and more via unified API
2. **Streaming Chat** - Real-time token streaming with `useChat` composable
3. **UI Components** - Ready-to-use chat components built with Nuxt UI
4. **Server Utilities** - Provider factory for server-side AI calls
5. **Team Integration** - Works with @crouton/auth for team-scoped AI

### Why Vercel AI SDK?

- **Multi-provider with unified API** - Switch providers with one line
- **First-class Nuxt/Vue support** - `@ai-sdk/vue` with `useChat` hook
- **Streaming built-in** - SSE streaming handled automatically
- **Active development** - v5 released, well maintained
- **Tool calling support** - Unified API for function calling across providers

### What This Package Does NOT Do

- **No collections included** - Collections are generated in consuming apps via `nuxt-crouton-collection-generator`
- **No API endpoints included** - Consuming apps create their own endpoints
- **No opinionated AI logic** - Package provides tools, apps define behavior

### End Result

```vue
<!-- In any crouton app -->
<template>
  <AIChatbox
    api="/api/ai/chat"
    :persist="true"
    class="h-96"
  />
</template>
```

```typescript
// Server endpoint in consuming app
import { createAIProvider } from '@crouton/ai/server'

export default defineEventHandler(async (event) => {
  const provider = createAIProvider(event)
  return streamText({ model: provider('gpt-4o'), messages })
})
```

---

## Architecture Overview

### Package Structure

```
packages/crouton-ai/
├── nuxt.config.ts
├── package.json
├── build.config.ts
│
├── app/
│   ├── composables/
│   │   ├── useChat.ts              # Wraps AI SDK useChat
│   │   ├── useCompletion.ts        # Text completion (optional)
│   │   └── useAIProvider.ts        # Access configured provider info
│   ├── components/
│   │   ├── AIChatbox.vue           # Full chat interface
│   │   ├── AIMessage.vue           # Single message bubble
│   │   └── AIInput.vue             # Message input with send
│   └── types/
│       └── index.ts                # TypeScript definitions
│
├── server/
│   └── utils/
│       ├── ai.ts                   # Provider factory
│       └── providers/
│           ├── openai.ts           # OpenAI setup
│           ├── anthropic.ts        # Anthropic setup
│           └── index.ts            # Provider registry
│
└── schemas/                         # For crouton generator
    └── chat-conversations.ts        # Collection schema definition
```

### Integration Points

```
┌─────────────────────────────────────────────────────────────┐
│                     Consuming App                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Generated       │  │ Custom API      │                   │
│  │ Collections     │  │ Endpoints       │                   │
│  │ (optional)      │  │ /api/ai/chat    │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   @crouton/ai                           ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ││
│  │  │ useChat()    │  │ AIChatbox    │  │ createAI     │  ││
│  │  │ composable   │  │ component    │  │ Provider()   │  ││
│  │  └──────────────┘  └──────────────┘  └──────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
│           │                    │                             │
│           ▼                    ▼                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   @crouton/auth                         ││
│  │         (team context, user session)                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Project Setup
**Estimated: 1-2 hours**

### Task 1.1: Initialize Package Structure
- [x] ✅ Create `packages/crouton-ai/` directory
- [x] ✅ Create `package.json` with dependencies
- [x] ✅ Create `tsconfig.json`
- [x] ✅ Create `nuxt.config.ts` for the layer (moved to Task 1.2)
- [x] ✅ Create `build.config.ts` for unbuild

**package.json:**
```json
{
  "name": "@crouton/ai",
  "version": "0.1.0",
  "description": "AI integration layer for Nuxt Crouton",
  "type": "module",
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts",
    "./server": {
      "types": "./dist/server/utils/index.d.ts",
      "import": "./dist/server/utils/index.mjs"
    },
    "./schemas/*": "./schemas/*"
  },
  "files": [
    "app",
    "server",
    "schemas",
    "dist",
    "nuxt.config.ts"
  ],
  "dependencies": {
    "ai": "^4.0.0",
    "@ai-sdk/vue": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/anthropic": "^1.0.0"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@nuxt/ui": "^3.0.0"
  },
  "devDependencies": {
    "unbuild": "^2.0.0",
    "typescript": "^5.0.0"
  }
}
```

### Task 1.2: Create Nuxt Config
- [x] ✅ Set up component auto-registration with `AI` prefix
- [x] ✅ Set up composable auto-imports
- [x] ✅ Set up server utils auto-imports
- [x] ✅ Define runtime config schema for AI settings

**nuxt.config.ts:**
```typescript
import { defineNuxtConfig } from 'nuxt/config'
import { join } from 'pathe'

const currentDir = new URL('.', import.meta.url).pathname

export default defineNuxtConfig({
  $meta: {
    name: 'crouton-ai',
    description: 'AI integration layer for Nuxt Crouton'
  },

  components: {
    dirs: [{
      path: join(currentDir, 'app/components'),
      prefix: 'AI',
      global: true
    }]
  },

  imports: {
    dirs: [join(currentDir, 'app/composables')]
  },

  nitro: {
    imports: {
      dirs: [join(currentDir, 'server/utils')]
    }
  },

  runtimeConfig: {
    // Server-only (API keys)
    openaiApiKey: '',
    anthropicApiKey: '',

    public: {
      croutonAI: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o'
      }
    }
  }
})
```

### Task 1.3: Create Type Definitions
- [x] ✅ Create `app/types/index.ts` with core types
- [x] ✅ Define message types
- [x] ✅ Define provider types
- [x] ✅ Define config types

**Types:**
```typescript
// app/types/index.ts
export interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

export interface AIProvider {
  id: string
  name: string
  models: string[]
}

export interface AIChatOptions {
  api?: string
  provider?: string
  model?: string
  systemPrompt?: string
  onFinish?: (message: AIMessage) => void
  onError?: (error: Error) => void
}

export interface AIProviderConfig {
  openai?: {
    apiKey?: string
    organization?: string
  }
  anthropic?: {
    apiKey?: string
  }
}
```

---

## Phase 2: Server Utilities
**Estimated: 2-3 hours**

### Task 2.1: Create Provider Factory
- [x] ✅ Create `server/utils/ai.ts` with `createAIProvider` function
- [x] ✅ Support OpenAI provider
- [x] ✅ Support Anthropic provider
- [x] ✅ Auto-detect provider from runtime config
- [x] ✅ Handle missing API keys gracefully

**Implementation:**
```typescript
// server/utils/ai.ts
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { H3Event } from 'h3'

export function createAIProvider(event?: H3Event) {
  const config = useRuntimeConfig(event)

  return {
    openai: () => {
      if (!config.openaiApiKey) {
        throw new Error('OpenAI API key not configured')
      }
      return createOpenAI({ apiKey: config.openaiApiKey })
    },

    anthropic: () => {
      if (!config.anthropicApiKey) {
        throw new Error('Anthropic API key not configured')
      }
      return createAnthropic({ apiKey: config.anthropicApiKey })
    },

    // Get model from any provider
    model: (modelId: string) => {
      if (modelId.startsWith('gpt') || modelId.startsWith('o1')) {
        return createAIProvider(event).openai()(modelId)
      }
      if (modelId.startsWith('claude')) {
        return createAIProvider(event).anthropic()(modelId)
      }
      // Default to OpenAI
      return createAIProvider(event).openai()(modelId)
    }
  }
}

// Convenience export
export { streamText, generateText } from 'ai'
```

### Task 2.2: Create Provider Helpers
- [x] ✅ Create `server/utils/providers/openai.ts`
- [x] ✅ Create `server/utils/providers/anthropic.ts`
- [x] ✅ Create `server/utils/providers/index.ts` registry
- [x] ✅ Add helper for listing available models

**Provider info for UI:**
```typescript
// server/utils/providers/index.ts
export const AI_PROVIDERS = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cheap' },
      { id: 'o1', name: 'o1', description: 'Reasoning model' },
    ]
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Balanced' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Most capable' },
    ]
  }
} as const

export function getAvailableProviders(config: RuntimeConfig) {
  const available = []
  if (config.openaiApiKey) available.push(AI_PROVIDERS.openai)
  if (config.anthropicApiKey) available.push(AI_PROVIDERS.anthropic)
  return available
}
```

### Task 2.3: Export Server Utils
- [x] ✅ Create build config for server utils export
- [x] ✅ Ensure types are generated
- [x] ✅ Test import from `@crouton/ai/server`

---

## Phase 3: Composables
**Estimated: 2-3 hours**

### Task 3.1: Create useChat Composable
- [x] ✅ Wrap AI SDK's `useChat` from `@ai-sdk/vue`
- [x] ✅ Add crouton-specific defaults
- [x] ✅ Integrate with team context (if @crouton/auth available)
- [x] ✅ Add persistence helpers

**Implementation:**
```typescript
// app/composables/useChat.ts
import { useChat as useAISDKChat } from '@ai-sdk/vue'
import type { AIChatOptions, AIMessage } from '../types'

export function useChat(options: AIChatOptions = {}) {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI

  // Try to get team context if @crouton/auth is available
  let teamId: string | undefined
  try {
    const { currentTeam } = useTeam()
    teamId = currentTeam.value?.id
  } catch {
    // @crouton/auth not installed, continue without team
  }

  const chat = useAISDKChat({
    api: options.api || '/api/ai/chat',
    body: {
      teamId,
      provider: options.provider || defaults.defaultProvider,
      model: options.model || defaults.defaultModel,
    },
    onFinish: (message) => {
      options.onFinish?.(message as AIMessage)
    },
    onError: (error) => {
      options.onError?.(error)
    }
  })

  return {
    // Core AI SDK returns
    messages: chat.messages,
    input: chat.input,
    handleSubmit: chat.handleSubmit,
    isLoading: chat.isLoading,
    error: chat.error,
    stop: chat.stop,
    reload: chat.reload,
    setMessages: chat.setMessages,
    append: chat.append,

    // Crouton helpers
    clearMessages: () => chat.setMessages([]),

    // For persistence (consuming app implements)
    exportMessages: () => toRaw(chat.messages.value),
    importMessages: (msgs: AIMessage[]) => chat.setMessages(msgs),
  }
}
```

### Task 3.2: Create useCompletion Composable
- [x] ✅ Wrap AI SDK's `useCompletion`
- [x] ✅ For single-turn text generation
- [x] ✅ Simpler than chat for quick AI calls

```typescript
// app/composables/useCompletion.ts
import { useCompletion as useAISDKCompletion } from '@ai-sdk/vue'

export function useCompletion(options: {
  api?: string
  onFinish?: (completion: string) => void
} = {}) {
  return useAISDKCompletion({
    api: options.api || '/api/ai/completion',
    onFinish: (_, completion) => options.onFinish?.(completion)
  })
}
```

### Task 3.3: Create useAIProvider Composable
- [x] ✅ Expose provider config to components
- [x] ✅ List available providers/models
- [x] ✅ For building provider selector UI

```typescript
// app/composables/useAIProvider.ts
export function useAIProvider() {
  const config = useRuntimeConfig()
  const defaults = config.public.croutonAI

  return {
    defaultProvider: computed(() => defaults.defaultProvider),
    defaultModel: computed(() => defaults.defaultModel),

    // Providers list (static, API keys checked server-side)
    providers: [
      { id: 'openai', name: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini'] },
      { id: 'anthropic', name: 'Anthropic', models: ['claude-sonnet-4-20250514'] },
    ]
  }
}
```

---

## Phase 4: UI Components
**Estimated: 3-4 hours**

### Task 4.1: Create AIMessage Component
- [ ] Display user and assistant messages
- [ ] Support markdown rendering
- [ ] Support code blocks with syntax highlighting
- [ ] Loading state for streaming
- [ ] Copy button for messages

```vue
<!-- app/components/AIMessage.vue -->
<script setup lang="ts">
import type { AIMessage } from '../types'

const props = defineProps<{
  message: AIMessage
  isStreaming?: boolean
}>()

const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div
    class="flex gap-3"
    :class="isUser ? 'flex-row-reverse' : 'flex-row'"
  >
    <!-- Avatar -->
    <UAvatar
      :icon="isUser ? 'i-heroicons-user' : 'i-heroicons-sparkles'"
      :color="isUser ? 'primary' : 'gray'"
      size="sm"
    />

    <!-- Message bubble -->
    <div
      class="max-w-[80%] rounded-lg px-4 py-2"
      :class="isUser
        ? 'bg-primary-500 text-white'
        : 'bg-gray-100 dark:bg-gray-800'"
    >
      <!-- Markdown content -->
      <div class="prose prose-sm dark:prose-invert max-w-none">
        <MDC :value="message.content" />
      </div>

      <!-- Streaming indicator -->
      <span
        v-if="isStreaming && !isUser"
        class="inline-block w-2 h-4 bg-current animate-pulse"
      />
    </div>
  </div>
</template>
```

### Task 4.2: Create AIInput Component
- [ ] Text input with send button
- [ ] Support Enter to send, Shift+Enter for newline
- [ ] Loading/disabled state
- [ ] Auto-resize textarea

```vue
<!-- app/components/AIInput.vue -->
<script setup lang="ts">
const props = defineProps<{
  modelValue?: string
  loading?: boolean
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()

const inputValue = computed({
  get: () => props.modelValue || '',
  set: (val) => emit('update:modelValue', val)
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!props.loading && inputValue.value.trim()) {
      emit('submit')
    }
  }
}
</script>

<template>
  <div class="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
    <UTextarea
      v-model="inputValue"
      :placeholder="placeholder || 'Type a message...'"
      :disabled="disabled || loading"
      :rows="1"
      autoresize
      class="flex-1"
      @keydown="handleKeydown"
    />
    <UButton
      icon="i-heroicons-paper-airplane"
      :loading="loading"
      :disabled="disabled || !inputValue.trim()"
      @click="emit('submit')"
    />
  </div>
</template>
```

### Task 4.3: Create AIChatbox Component
- [ ] Combine AIMessage + AIInput
- [ ] Handle message list rendering
- [ ] Auto-scroll to bottom on new messages
- [ ] Empty state
- [ ] Error handling

```vue
<!-- app/components/AIChatbox.vue -->
<script setup lang="ts">
const props = withDefaults(defineProps<{
  api?: string
  systemPrompt?: string
  placeholder?: string
  emptyMessage?: string
}>(), {
  api: '/api/ai/chat',
  emptyMessage: 'Start a conversation...'
})

const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error
} = useChat({ api: props.api })

// Auto-scroll
const messagesContainer = ref<HTMLElement>()
watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}, { deep: true })
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <!-- Empty state -->
      <div
        v-if="messages.length === 0"
        class="h-full flex items-center justify-center text-gray-400"
      >
        {{ emptyMessage }}
      </div>

      <!-- Message list -->
      <AIMessage
        v-for="(message, index) in messages"
        :key="message.id || index"
        :message="message"
        :is-streaming="isLoading && index === messages.length - 1 && message.role === 'assistant'"
      />
    </div>

    <!-- Error -->
    <UAlert
      v-if="error"
      color="red"
      variant="soft"
      class="mx-4 mb-2"
      :title="error.message"
      :close-button="{ icon: 'i-heroicons-x-mark' }"
    />

    <!-- Input -->
    <AIInput
      v-model="input"
      :loading="isLoading"
      :placeholder="placeholder"
      @submit="handleSubmit"
    />
  </div>
</template>
```

---

## Phase 5: Schema for Generator
**Estimated: 1-2 hours**

### Task 5.1: Create Chat Conversations Schema
- [ ] Define schema compatible with crouton generator
- [ ] Include all necessary fields for chat persistence
- [ ] Document usage with generator

```typescript
// schemas/chat-conversations.ts
import { z } from 'zod'

/**
 * Schema for chat conversations collection.
 *
 * Generate with:
 * pnpm crouton generate chat-conversations --schema @crouton/ai/schemas/chat-conversations
 */
export const chatConversationsSchema = {
  name: 'chatConversations',

  schema: z.object({
    id: z.string().uuid(),
    teamId: z.string(),
    userId: z.string(),
    title: z.string().optional(),
    messages: z.array(z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
      createdAt: z.string().datetime(),
    })),
    provider: z.string().optional(),
    model: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),

  // Collection config hints
  config: {
    scope: 'team',        // Team-scoped collection
    softDelete: false,    // No soft delete needed
    timestamps: true,     // Auto timestamps
  }
}

export default chatConversationsSchema
```

### Task 5.2: Document Generator Integration
- [ ] Add README section on generating collections
- [ ] Example commands
- [ ] Example usage after generation

---

## Phase 6: Documentation & Testing
**Estimated: 2-3 hours**

### Task 6.1: Create README
- [ ] Quick start guide
- [ ] Configuration options
- [ ] Component API reference
- [ ] Composable API reference
- [ ] Server utilities reference
- [ ] Examples

### Task 6.2: Add Usage Examples
- [ ] Basic chatbox example
- [ ] With persistence example
- [ ] Custom endpoint example
- [ ] Provider switching example

### Task 6.3: Type Checking
- [ ] Run `npx nuxt typecheck`
- [ ] Fix any type errors
- [ ] Ensure exports are typed correctly

---

## Usage Examples

### Basic Usage (No Persistence)

```vue
<!-- pages/chat.vue -->
<template>
  <AIChatbox class="h-[600px]" />
</template>
```

### With Custom Endpoint

```vue
<!-- pages/ai-assistant.vue -->
<template>
  <AIChatbox
    api="/api/my-assistant/chat"
    system-prompt="You are a helpful assistant for our booking system."
    placeholder="Ask about bookings..."
  />
</template>
```

### Creating the Server Endpoint

```typescript
// server/api/ai/chat.post.ts (in consuming app)
import { createAIProvider, streamText } from '@crouton/ai/server'

export default defineEventHandler(async (event) => {
  // Optional: Get team context
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const { messages, model } = await readBody(event)

  // Get AI provider
  const ai = createAIProvider(event)

  // Stream response
  const result = await streamText({
    model: ai.model(model || 'gpt-4o'),
    messages,
    system: 'You are a helpful assistant.',
  })

  return result.toDataStreamResponse()
})
```

### With Persistence (After Generating Collection)

```bash
# Generate the collection first
pnpm crouton generate chat-conversations --schema @crouton/ai/schemas/chat-conversations
```

```vue
<!-- pages/conversations/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const conversationId = route.params.id as string

// Load existing conversation
const { data: conversation } = await useFetch(`/api/chat-conversations/${conversationId}`)

const { messages, importMessages, exportMessages } = useChat()

// Load messages on mount
onMounted(() => {
  if (conversation.value?.messages) {
    importMessages(conversation.value.messages)
  }
})

// Save on changes
watchDebounced(messages, async () => {
  await $fetch(`/api/chat-conversations/${conversationId}`, {
    method: 'PATCH',
    body: { messages: exportMessages() }
  })
}, { debounce: 1000 })
</script>

<template>
  <AIChatbox class="h-full" />
</template>
```

---

## Environment Variables

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Set defaults
NUXT_PUBLIC_CROUTON_AI_DEFAULT_PROVIDER=openai
NUXT_PUBLIC_CROUTON_AI_DEFAULT_MODEL=gpt-4o
```

---

## Dependencies

### Runtime Dependencies
- `ai` - Vercel AI SDK core
- `@ai-sdk/vue` - Vue/Nuxt integration
- `@ai-sdk/openai` - OpenAI provider
- `@ai-sdk/anthropic` - Anthropic provider

### Peer Dependencies
- `nuxt` ^4.0.0
- `@nuxt/ui` ^3.0.0

### Dev Dependencies
- `unbuild` - Build tooling
- `typescript` - Type checking

---

## Future Enhancements (Not in MVP)

These components can be added later based on demand from consuming apps:

| Component | Use Case | Complexity |
|-----------|----------|------------|
| `AIProviderSelect` | UI to switch providers | Low |
| `AIModelSelect` | UI to switch models | Low |
| `AITypingIndicator` | Animated typing dots | Low |
| `AIMessageActions` | Copy, regenerate, feedback | Medium |
| `AIConversationList` | List saved conversations | Medium |
| `AIFlowAnalysis` | Analyze graph structures | High |
| `AIFieldSuggestion` | Form field autocomplete | High |

---

## Task Checklist Summary

### Phase 1: Project Setup (1-2h) ✅
- [x] Task 1.1: Initialize Package Structure
- [x] Task 1.2: Create Nuxt Config
- [x] Task 1.3: Create Type Definitions

### Phase 2: Server Utilities (2-3h) ✅
- [x] Task 2.1: Create Provider Factory
- [x] Task 2.2: Create Provider Helpers
- [x] Task 2.3: Export Server Utils

### Phase 3: Composables (2-3h) ✅
- [x] Task 3.1: Create useChat Composable
- [x] Task 3.2: Create useCompletion Composable
- [x] Task 3.3: Create useAIProvider Composable

### Phase 4: UI Components (3-4h)
- [ ] Task 4.1: Create AIMessage Component
- [ ] Task 4.2: Create AIInput Component
- [ ] Task 4.3: Create AIChatbox Component

### Phase 5: Schema for Generator (1-2h)
- [ ] Task 5.1: Create Chat Conversations Schema
- [ ] Task 5.2: Document Generator Integration

### Phase 6: Documentation & Testing (2-3h)
- [ ] Task 6.1: Create README
- [ ] Task 6.2: Add Usage Examples
- [ ] Task 6.3: Type Checking

---

## Success Criteria

The package is complete when:

1. [ ] Fresh Nuxt app can add `@crouton/ai` and use `<AIChatbox />`
2. [ ] OpenAI and Anthropic providers work out of the box
3. [ ] Streaming works correctly with real-time token display
4. [ ] Components render correctly with Nuxt UI
5. [ ] Server utilities export correctly from `@crouton/ai/server`
6. [ ] TypeScript types are complete and accurate
7. [ ] Schema can be used with crouton generator
8. [ ] README documents all features clearly

---

## References

- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [AI SDK Vue/Nuxt Guide](https://ai-sdk.dev/docs/getting-started/nuxt)
- [AI SDK Providers](https://ai-sdk.dev/providers/ai-sdk-providers)
- [Nuxt UI Chat Template](https://github.com/nuxt-ui-templates/chat)
- [@crouton/auth Package Plan](./crouton-auth-package.md)
- [nuxt-crouton Architecture](../architecture/)
