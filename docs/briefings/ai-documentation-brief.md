# AI Package Documentation Brief

**Date**: 2024-12-17
**Status**: ✅ ALL PHASES COMPLETED
**Priority**: High - Package has no public documentation
**Rename Status**: ✅ COMPLETED - Package renamed to `@friendlyinternet/nuxt-crouton-ai`
**Documentation Status**: ✅ COMPLETED - All documentation created and updated

---

## Executive Summary

The `@crouton/ai` package provides AI integration for Nuxt Crouton applications but currently has **zero public documentation**. This brief outlines the documentation that needs to be created and the updates required to existing documentation to include this package.

---

## Part 1: Package Rename Decision

### Current State

The AI package uses a different namespace than all other packages:

| Package | Namespace |
|---------|-----------|
| `nuxt-crouton` | `@friendlyinternet/nuxt-crouton` |
| `nuxt-crouton-i18n` | `@friendlyinternet/nuxt-crouton-i18n` |
| `nuxt-crouton-editor` | `@friendlyinternet/nuxt-crouton-editor` |
| `nuxt-crouton-supersaas` | `@friendlyinternet/nuxt-crouton-supersaas` |
| `nuxt-crouton-assets` | `@friendlyinternet/nuxt-crouton-assets` |
| `nuxt-crouton-devtools` | `@friendlyinternet/nuxt-crouton-devtools` |
| `nuxt-crouton-events` | `@friendlyinternet/nuxt-crouton-events` |
| `nuxt-crouton-maps` | `@friendlyinternet/nuxt-crouton-maps` |
| `nuxt-crouton-flow` | `@friendlyinternet/nuxt-crouton-flow` |
| **crouton-ai** | **`@crouton/ai`** |

### Decision: ✅ RENAME COMPLETED

**Renamed to `@friendlyinternet/nuxt-crouton-ai`**
- Consistent with all other packages
- Clear that it's part of the Nuxt Crouton ecosystem
- Follows established naming pattern

### Files Updated

```
packages/nuxt-crouton-ai/package.json     ✅ Updated name and repository directory
packages/nuxt-crouton-ai/CLAUDE.md        ✅ Updated all references
Directory renamed: crouton-ai → nuxt-crouton-ai  ✅ Done
```

---

## Part 2: New Documentation Required

### 2.1 Feature Page: AI Integration

**Location**: `/Users/pmcp/Projects/crouton-docs/content/6.features/13.ai.md`

**Suggested Structure**:

```markdown
---
title: AI Integration
description: Chat, completion, and multi-provider AI support for Nuxt Crouton
icon: i-heroicons-sparkles
badge: NEW
---

## Overview
- Package info (name, version, type)
- What's included (composables, components, server utils)
- Supported providers (OpenAI, Anthropic)

## Installation
- Prerequisites
- Package install command
- Nuxt config setup
- Environment variables

## Quick Start
- Basic chat example
- Basic completion example

## Composables

### useChat()
- Props/options
- Return values
- Examples (basic, with system prompt, streaming)

### useCompletion()
- Props/options
- Return values
- Examples

### useAIProvider()
- Provider selection
- Auto-detection

## Components

### AIChatbox
- Full chat interface
- Props and events
- Customization

### AIMessage
- Message bubble component
- Props

### AIInput
- Message input with send
- Props and events

## Server Usage
- createAIProvider()
- Provider factory
- Model auto-detection
- streamText / generateText examples

## Providers

### OpenAI
- Supported models (gpt-4o, gpt-4, gpt-3.5-turbo, o1-*, o3-*)
- Configuration

### Anthropic
- Supported models (claude-sonnet-4-20250514, claude-3-opus, etc.)
- Configuration

## Conversation Persistence
- Chat conversations schema
- Using with crouton generator
- importMessages() / exportMessages()

## Best Practices
- API key security
- Rate limiting
- Error handling
- Cost optimization

## Troubleshooting
- Common errors
- Provider issues

## API Reference
- Full type definitions
```

**Estimated Length**: ~800-1200 lines (similar to assets.md or flow.md)

---

## Part 3: Updates to Existing Documentation

### 3.1 README.md (nuxt-crouton repo)

**File**: `/Users/pmcp/Projects/nuxt-crouton/README.md`

**Changes Required**:

1. **Add to Packages section** (after supersaas, before generator):
```markdown
### [@friendlyinternet/nuxt-crouton-ai](./packages/nuxt-crouton-ai)
AI integration layer with chat, completion, and multi-provider support (OpenAI, Anthropic).
```

2. **Update Installation section** - add:
```bash
# For AI capabilities (chat, completion)
pnpm add @friendlyinternet/nuxt-crouton-ai
```

3. **Update Configuration section** - add to extends example:
```typescript
'@friendlyinternet/nuxt-crouton-ai',      // For AI chat/completion
```

4. **Update Architecture diagram** - add ai layer

5. **Add to Features section**:
```markdown
### AI Layer (`@friendlyinternet/nuxt-crouton-ai`)
- ✅ **useChat()** - Streaming chat with context
- ✅ **useCompletion()** - Text completion
- ✅ **AIChatbox** - Full chat interface component
- ✅ **Multi-provider** - OpenAI and Anthropic support
- ✅ **Server utilities** - Provider factory and streaming
```

6. **Remove broken references**:
- Remove link to `examples/` directory
- Remove link to `CONTRIBUTING.md`

7. **Add other missing packages** (while updating):
- assets, devtools, events, maps, flow

---

### 3.2 Packages Overview (external docs)

**File**: `/Users/pmcp/Projects/crouton-docs/content/2.fundamentals/7.packages.md`

**Changes Required**:

1. **Update opening paragraph**:
```markdown
# Before
Nuxt Crouton is a **modular ecosystem** consisting of 4 separate packages.

# After
Nuxt Crouton is a **modular ecosystem** consisting of 11 packages (1 core, 1 generator CLI, and 9 addon layers).
```

2. **Add new section for AI package** (after supersaas section):
```markdown
### 6. @friendlyinternet/nuxt-crouton-ai

**Purpose**: AI chat and completion integration
**Install**: `pnpm add @friendlyinternet/nuxt-crouton-ai`

**Contains**:
- useChat() composable (streaming chat)
- useCompletion() composable
- AIChatbox, AIMessage, AIInput components
- Server utilities for OpenAI and Anthropic
- Chat conversation persistence schema

**When to use**:
- Building AI-powered chat interfaces
- Need text completion/generation
- Want multi-provider support (OpenAI, Anthropic)

**Config**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-ai'
  ]
})
```

**Environment Variables**:
```bash
NUXT_OPENAI_API_KEY=sk-...
NUXT_ANTHROPIC_API_KEY=sk-ant-...
```

**Optional**: Only install if you need AI features.
```

3. **Add sections for other missing packages**:
- nuxt-crouton-assets (section 6)
- nuxt-crouton-events (section 7)
- nuxt-crouton-maps (section 8)
- nuxt-crouton-devtools (section 9)
- nuxt-crouton-flow (section 10)
- nuxt-crouton-ai (section 11)

4. **Update dependency diagram** to include all packages

5. **Update "Field Types and Required Packages" table**:
```markdown
| Field Type | Required Package | Install Command |
|------------|------------------|-----------------|
| `editor` | `nuxt-crouton-editor` | `pnpm add @friendlyinternet/nuxt-crouton-editor` |
| `i18n` | `nuxt-crouton-i18n` | `pnpm add @friendlyinternet/nuxt-crouton-i18n` |
| `asset` | `nuxt-crouton-assets` | `pnpm add @friendlyinternet/nuxt-crouton-assets` |
| `map` | `nuxt-crouton-maps` | `pnpm add @friendlyinternet/nuxt-crouton-maps` |
```

---

### 3.3 Getting Started / Installation

**File**: `/Users/pmcp/Projects/crouton-docs/content/1.getting-started/2.installation.md`

**Check and update** if package list is mentioned.

---

### 3.4 Features Overview

**File**: `/Users/pmcp/Projects/crouton-docs/content/6.features/0.overview.md`

**Add AI to the features list** with link to new AI page.

---

## Part 4: Reference Material

### Source Files to Reference

When writing the AI documentation, use these source files:

| File | Content |
|------|---------|
| `packages/crouton-ai/CLAUDE.md` | Package overview, architecture, common tasks |
| `packages/crouton-ai/app/composables/useChat.ts` | Chat composable implementation |
| `packages/crouton-ai/app/composables/useCompletion.ts` | Completion composable |
| `packages/crouton-ai/app/components/Chatbox.vue` | Chat interface component |
| `packages/crouton-ai/server/utils/ai.ts` | Server provider factory |
| `packages/crouton-ai/schemas/chat-conversations.json` | Persistence schema |
| `packages/crouton-ai/app/types/index.ts` | TypeScript types |

### Similar Documentation for Reference

Use these existing feature docs as templates for style/structure:
- `6.features/7.assets.md` - Similar addon package pattern
- `6.features/12.flow.md` - Complex feature with composables/components

---

## Part 5: Implementation Checklist

### Phase 1: Package Rename ✅ COMPLETED
- [x] Update `packages/crouton-ai/package.json` name
- [x] Rename directory to `packages/nuxt-crouton-ai`
- [x] Update `packages/crouton-ai/CLAUDE.md` references
- [x] Update all internal imports and references (26 occurrences across 9 files)

### Phase 2: Create AI Documentation ✅ COMPLETED
- [x] Create `crouton-docs/content/6.features/13.ai.md`
- [x] Add all sections from structure above
- [x] Include code examples from CLAUDE.md
- [x] No screenshots needed (component-based)

### Phase 3: Update README.md ✅ COMPLETED
- [x] Add AI package to packages list
- [x] Add installation command
- [x] Add to config example
- [x] Add to features section
- [x] Remove broken links (examples/, CONTRIBUTING.md)
- [x] Add other 5 missing packages (assets, devtools, events, maps, flow)

### Phase 4: Update External Docs ✅ COMPLETED
- [x] Update `7.packages.md` count and add all missing package sections
- [x] Update `0.overview.md` in features
- [x] Field types table updated
- [x] Installation patterns updated

### Phase 5: Verify ✅ COMPLETED
- [x] All links work (13.ai.md exists in features)
- [x] Package name is consistent everywhere (`@friendlyinternet/nuxt-crouton-ai`)
- [x] No duplicate/conflicting information

---

## Appendix: Current AI Package Contents

From `packages/nuxt-crouton-ai/CLAUDE.md`:

**Composables**:
- `useChat()` - Streaming chat with team context
- `useCompletion()` - Text completion
- `useAIProvider()` - Provider selection

**Components** (auto-import with `AI` prefix):
- `Chatbox.vue` → `<AIChatbox />`
- `Message.vue` → `<AIMessage />`
- `Input.vue` → `<AIInput />`

**Server Utils**:
- `createAIProvider(event)` - Factory for providers
- Auto-detects provider from model ID:
  - `gpt-*`, `o1-*`, `o3-*` → OpenAI
  - `claude-*` → Anthropic

**Schemas**:
- `schemas/chat-conversations.json` - For crouton generator
- `schemas/chat-conversations.ts` - TypeScript with Zod

**Dependencies**:
- `ai` (Vercel AI SDK)
- `@ai-sdk/vue`
- `@ai-sdk/openai`
- `@ai-sdk/anthropic`
