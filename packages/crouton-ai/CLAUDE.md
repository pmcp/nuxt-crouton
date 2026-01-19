# CLAUDE.md - @fyit/crouton-ai

## Package Purpose

AI integration layer for Nuxt applications using Vercel AI SDK. Provides composables for chat/completion, server utilities for multi-provider support (OpenAI, Anthropic), and auto-configured components.

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/useChat.ts` | Streaming chat with team context |
| `app/composables/useCompletion.ts` | Text completion composable |
| `app/composables/useAIProvider.ts` | Provider selection |
| `app/composables/useTranslationSuggestion.ts` | AI-powered translation suggestions |
| `app/components/Chatbox.vue` | Full chat interface component |
| `app/components/Message.vue` | Single message bubble |
| `app/components/Input.vue` | Message input with send |
| `server/utils/ai.ts` | Server-side provider factory |
| `server/utils/providers/index.ts` | Provider registry and helpers |
| `server/api/ai/translate.post.ts` | Translation API endpoint |
| `app/types/index.ts` | All TypeScript types |
| `app/types/translation.ts` | Translation-specific types |
| `app/editor/extensions/translation-ai.ts` | TipTap extension for translation |
| `app/assets/css/translation.css` | Ghost text and suggestion styles |
| `schemas/chat-conversations.json` | JSON schema for crouton generator |
| `schemas/chat-conversations.ts` | TypeScript schema with Zod validation |

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
  extends: ['@fyit/crouton-ai'],
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
// createAIProvider is auto-imported when extending the layer
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

## AI Translation

The package provides AI-powered translation suggestions for multi-language content.

### Translation API Endpoint

```typescript
// POST /api/ai/translate
{
  "sourceText": "Hello world",
  "sourceLanguage": "en",
  "targetLanguage": "nl",
  "fieldType": "product_name",          // Optional: for context
  "existingTranslations": { "fr": "..." } // Optional: for consistency
}

// Response
{
  "text": "Hallo wereld",
  "confidence": 0.9
}
```

### useTranslationSuggestion Composable

```typescript
const { suggestion, isLoading, suggest, accept, clear } = useTranslationSuggestion()

// Request translation
const result = await suggest({
  sourceText: 'Hello world',
  sourceLanguage: 'en',
  targetLanguage: 'nl',
  fieldType: 'product_name'
})

// Use the result
if (result) {
  console.log(result.text) // "Hallo wereld"
}
```

### TipTap Editor Extension

```typescript
import { TranslationAI } from '@fyit/crouton-ai/editor'

const editor = useEditor({
  extensions: [
    TranslationAI.configure({
      getContext: () => ({
        sourceText: getSelectedText(),
        sourceLanguage: 'en',
        targetLanguage: 'nl'
      }),
      onAccept: (text) => console.log('Accepted:', text)
    })
  ]
})
```

**Keyboard Shortcuts:**
- `Cmd/Ctrl+J` - Trigger translation suggestion
- `Tab` - Accept suggestion
- `Escape` - Dismiss suggestion

### Integration with CroutonI18nInput

```vue
<CroutonI18nInput
  v-model="translations"
  :fields="['name', 'description']"
  show-ai-translate
  field-type="product"
/>
```

### Integration with CroutonEditorSimple

```vue
<CroutonEditorSimple
  v-model="content"
  enable-translation-ai
  :translation-context="{
    sourceText: content,
    sourceLanguage: 'en',
    targetLanguage: 'nl'
  }"
  @translation-accept="(text) => handleTranslation(text)"
/>
```

### Field Type Context

The translation endpoint recognizes field types for better translations:
- `product_name`, `product_description` - Marketing tone
- `title`, `description`, `content` - Natural language
- `label`, `button`, `tooltip` - Short UI text
- `email_subject`, `email_body` - Email tone
- `error`, `success` - Feedback messages

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

### Generate chat conversations collection
1. Run: `pnpm crouton ai chatConversations --fields-file=node_modules/@fyit/crouton-ai/schemas/chat-conversations.json`
2. Or use config file with `fieldsFile: 'node_modules/@fyit/crouton-ai/schemas/chat-conversations.json'`
3. Generated collection includes: title, messages, provider, model, systemPrompt, metadata
4. Use `importMessages()` / `exportMessages()` from `useChat()` for persistence

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
