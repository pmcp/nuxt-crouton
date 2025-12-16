# CLAUDE.md - @crouton/ai

## Package Purpose

AI integration layer for Nuxt applications using Vercel AI SDK. Provides composables for chat/completion, server utilities for multi-provider support (OpenAI, Anthropic), and auto-configured components.

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/useChat.ts` | Streaming chat with team context |
| `app/composables/useCompletion.ts` | Text completion composable |
| `app/composables/useAIProvider.ts` | Provider selection |
| `server/utils/ai.ts` | Server-side provider factory |
| `app/types/index.ts` | All TypeScript types |

## Architecture

```
Client                          Server
────────                        ──────
useChat()   ──POST──>  /api/ai/chat
  │                        │
  │                   createAIProvider(event)
  │                        │
  │                   ai.model('gpt-4o')
  │                        │
  ◄──────stream────────────┘
```

## Configuration

```bash
# .env
NUXT_OPENAI_API_KEY=sk-...
NUXT_ANTHROPIC_API_KEY=sk-ant-...
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@crouton/ai'],
  runtimeConfig: {
    public: {
      croutonAI: {
        defaultProvider: 'openai',
        defaultModel: 'gpt-4o'
      }
    }
  }
})
```

## Client Usage

```typescript
// In a component
const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/ai/chat',
  model: 'gpt-4o',
  systemPrompt: 'You are a helpful assistant',
  onFinish: (msg) => console.log('Done:', msg),
  onError: (err) => console.error(err)
})
```

## Server Usage

```typescript
// server/api/ai/chat.post.ts
import { createAIProvider } from '@crouton/ai/server'
import { streamText } from 'ai'

export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody(event)
  const ai = createAIProvider(event)

  const result = await streamText({
    model: ai.model(model), // Auto-detects provider
    messages
  })

  return result.toDataStreamResponse()
})
```

## Provider Auto-Detection

`ai.model()` auto-detects provider from model ID:
- `gpt-*`, `o1-*`, `o3-*` → OpenAI
- `claude-*` → Anthropic

```typescript
ai.model('gpt-4o')           // Uses OpenAI
ai.model('claude-sonnet-4-20250514')   // Uses Anthropic
```

## Types

```typescript
interface AIMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

interface AIChatOptions {
  api?: string
  id?: string
  provider?: string
  model?: string
  systemPrompt?: string
  initialMessages?: AIMessage[]
  onFinish?: (message: AIMessage) => void
  onError?: (error: Error) => void
}
```

## Component Naming

All components auto-import with `AI` prefix:
- `Chatbox.vue` → `<AIChatbox />`
- `Message.vue` → `<AIMessage />`
- `Input.vue` → `<AIInput />`

## Common Tasks

### Add a new provider
1. Create `server/utils/providers/{name}.ts`
2. Export factory function using `@ai-sdk/{name}`
3. Add to `createAIProvider()` in `server/utils/ai.ts`
4. Add model detection in `ai.model()` switch

### Add a new composable
1. Create `app/composables/use{Name}.ts`
2. Add types to `app/types/index.ts`
3. Export from `app/composables/index.ts`

### Create AI endpoint
1. Create `server/api/ai/{endpoint}.post.ts`
2. Use `createAIProvider(event)` for provider access
3. Use `streamText` or `generateText` from `ai` package

## Dependencies

- **Core**: `ai` (Vercel AI SDK)
- **Providers**: `@ai-sdk/vue`, `@ai-sdk/openai`, `@ai-sdk/anthropic`
- **Peer**: `nuxt ^4.0.0`, `@nuxt/ui ^3.0.0`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NUXT_OPENAI_API_KEY` | If using OpenAI | OpenAI API key |
| `NUXT_ANTHROPIC_API_KEY` | If using Anthropic | Anthropic API key |

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build with unbuild
```
