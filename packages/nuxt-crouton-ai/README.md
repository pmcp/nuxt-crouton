# @friendlyinternet/nuxt-crouton-ai

AI integration layer for Nuxt Crouton applications. Provides multi-provider AI chat with streaming support, built on [Vercel AI SDK](https://ai-sdk.dev/).

## Features

- **Multi-Provider Support** - OpenAI, Anthropic Claude via unified API
- **Streaming Chat** - Real-time token streaming with `useChat` composable
- **UI Components** - Ready-to-use chat components built with Nuxt UI
- **Server Utilities** - Provider factory for server-side AI calls
- **Persistence Schema** - Collection schema for the crouton generator

## Installation

```bash
pnpm add @friendlyinternet/nuxt-crouton-ai
```

Add to your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-ai']
})
```

## Configuration

Set your API keys in `.env`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Set defaults
NUXT_PUBLIC_CROUTON_AI_DEFAULT_PROVIDER=openai
NUXT_PUBLIC_CROUTON_AI_DEFAULT_MODEL=gpt-4o
```

## Quick Start

### Basic Chat Interface

```vue
<template>
  <AIChatbox class="h-96" />
</template>
```

### With Custom Endpoint

```vue
<template>
  <AIChatbox
    api="/api/my-assistant/chat"
    placeholder="Ask me anything..."
    empty-message="How can I help you today?"
  />
</template>
```

### Create a Server Endpoint

```typescript
// server/api/ai/chat.post.ts
// createAIProvider is auto-imported when extending the layer
// streamText comes from the 'ai' package (Vercel AI SDK)
import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody(event)

  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(model || 'gpt-4o'),
    messages,
    system: 'You are a helpful assistant.'
  })

  return result.toDataStreamResponse()
})
```

## Components

### AIChatbox

Full chat interface combining message list and input.

```vue
<AIChatbox
  api="/api/ai/chat"
  placeholder="Type a message..."
  empty-message="Start a conversation..."
/>
```

**Props:**
- `api` - API endpoint for chat (default: `/api/ai/chat`)
- `placeholder` - Input placeholder text
- `emptyMessage` - Message shown when no messages
- `systemPrompt` - System prompt to include

### AIMessage

Single message bubble component.

```vue
<AIMessage
  :message="{ id: '1', role: 'user', content: 'Hello!' }"
  :is-streaming="false"
/>
```

**Props:**
- `message` - Message object with `id`, `role`, `content`
- `isStreaming` - Show streaming indicator

### AIInput

Message input with send button.

```vue
<AIInput
  v-model="input"
  :loading="isLoading"
  placeholder="Type here..."
  @submit="handleSubmit"
/>
```

**Props:**
- `modelValue` - Input text (v-model)
- `loading` - Show loading state
- `placeholder` - Placeholder text
- `disabled` - Disable input

**Events:**
- `update:modelValue` - Input changed
- `submit` - Send button clicked or Enter pressed

## Composables

### useChat

Wraps AI SDK's `useChat` with crouton-specific features.

```typescript
const {
  messages,
  input,
  handleSubmit,
  isLoading,
  error,
  stop,
  reload,
  setMessages,
  append,
  clearMessages,
  exportMessages,
  importMessages
} = useChat({
  api: '/api/ai/chat',
  provider: 'openai',
  model: 'gpt-4o',
  onFinish: (message) => console.log('Done:', message),
  onError: (error) => console.error('Error:', error)
})
```

### useCompletion

For single-turn text generation.

```typescript
const {
  completion,
  input,
  handleSubmit,
  isLoading
} = useCompletion({
  api: '/api/ai/completion'
})
```

### useAIProvider

Access provider configuration.

```typescript
const {
  defaultProvider,
  defaultModel,
  providers
} = useAIProvider()
```

## Server Utilities

All server utilities are auto-imported when extending the layer.

### createAIProvider

Factory function for creating AI provider instances.

```typescript
// All utilities auto-imported - no import statement needed
export default defineEventHandler(async (event) => {
  const ai = createAIProvider(event)

  // Use OpenAI
  const openai = ai.openai()

  // Use Anthropic
  const anthropic = ai.anthropic()

  // Auto-detect from model name
  const model = ai.model('gpt-4o')  // Returns OpenAI
  const model2 = ai.model('claude-sonnet-4-20250514')  // Returns Anthropic
})
```

### Available Providers

```typescript
// AI_PROVIDERS and helpers are auto-imported
export default defineEventHandler(async (event) => {
  // Get all providers
  console.log(AI_PROVIDERS.openai.models)

  // Get configured providers (with API keys)
  const available = getAvailableProviders(useRuntimeConfig())
})
```

## Generating Collections for Persistence

The package includes a schema for generating a chat conversations collection using the crouton collection generator.

### Option 1: CLI Command

```bash
# Generate in a new 'ai' layer
pnpm crouton ai chatConversations --fields-file=node_modules/@friendlyinternet/nuxt-crouton-ai/schemas/chat-conversations.json
```

### Option 2: Config File

```javascript
// crouton.config.js
export default {
  collections: [
    {
      name: 'chatConversations',
      fieldsFile: 'node_modules/@friendlyinternet/nuxt-crouton-ai/schemas/chat-conversations.json'
    }
  ],
  targets: [
    { layer: 'ai', collections: ['chatConversations'] }
  ],
  dialect: 'sqlite'
}
```

Then run:

```bash
pnpm crouton config ./crouton.config.js
```

### Schema Fields

The generated collection includes:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Optional conversation title |
| `messages` | json | Array of chat messages |
| `provider` | string | AI provider (openai, anthropic) |
| `model` | string | Model identifier |
| `systemPrompt` | text | System prompt used |
| `metadata` | json | Additional metadata |
| `messageCount` | number | Cached message count |
| `lastMessageAt` | date | Last message timestamp |

Plus auto-generated fields: `id`, `teamId`, `userId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

### Using with Persistence

After generating the collection:

```vue
<script setup lang="ts">
const route = useRoute()
const conversationId = route.params.id as string

// Load existing conversation
const { data: conversation } = await useFetch(`/api/ai-chatConversations/${conversationId}`)

const { messages, importMessages, exportMessages } = useChat()

// Load messages on mount
onMounted(() => {
  if (conversation.value?.messages) {
    importMessages(conversation.value.messages)
  }
})

// Auto-save on changes
watchDebounced(messages, async () => {
  await $fetch(`/api/ai-chatConversations/${conversationId}`, {
    method: 'PATCH',
    body: {
      messages: exportMessages(),
      messageCount: messages.value.length,
      lastMessageAt: new Date().toISOString()
    }
  })
}, { debounce: 1000 })
</script>

<template>
  <AIChatbox class="h-full" />
</template>
```

### TypeScript Types

Import types from the schema:

```typescript
import type {
  ChatConversation,
  NewChatConversation,
  ChatMessage
} from '@friendlyinternet/nuxt-crouton-ai/schemas/chat-conversations'
```

## Examples

### Basic Chat Page

```vue
<!-- pages/chat.vue -->
<template>
  <div class="container mx-auto p-4">
    <h1 class="text-2xl font-bold mb-4">AI Assistant</h1>
    <AIChatbox class="h-[600px]" />
  </div>
</template>
```

### Chat with Model Selection

```vue
<script setup lang="ts">
const selectedModel = ref('gpt-4o')
const { providers } = useAIProvider()

const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/ai/chat',
  model: selectedModel.value
})
</script>

<template>
  <div class="space-y-4">
    <USelect
      v-model="selectedModel"
      :options="providers.flatMap(p => p.models)"
    />
    <AIChatbox class="h-96" />
  </div>
</template>
```

### Custom Message Rendering

```vue
<script setup lang="ts">
const { messages, input, handleSubmit, isLoading } = useChat()
</script>

<template>
  <div class="flex flex-col h-96">
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="message.role === 'user' ? 'text-right' : 'text-left'"
      >
        <div
          class="inline-block px-4 py-2 rounded-lg"
          :class="message.role === 'user'
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 dark:bg-gray-800'"
        >
          {{ message.content }}
        </div>
      </div>
    </div>

    <AIInput
      v-model="input"
      :loading="isLoading"
      @submit="handleSubmit"
    />
  </div>
</template>
```

## License

MIT
