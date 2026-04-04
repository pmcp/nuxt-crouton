# NodeChatPanel duplicates ChatPanel persistence logic

**Status:** done
**Type:** idea

## Summary

Extracted duplicate chat persistence logic from `ChatPanel.vue` and `NodeChatPanel.vue` into a shared `useChatPersistence` composable.

## Changes

- **New:** `apps/thinkgraph/app/composables/useChatPersistence.ts` — shared load/save conversation logic
- **Modified:** `apps/thinkgraph/app/components/ChatPanel.vue` — uses `useChatPersistence` composable
- **Modified:** `apps/thinkgraph/app/components/NodeChatPanel.vue` — uses `useChatPersistence` composable

## Design

The composable accepts:
- `teamId` ref for API base path
- `callbacks` object with `clearMessages`, `exportMessages`, `importMessages` from `useChat`
- Optional `onClear` hook (used by ChatPanel to reset `addedIds`)

Returns `conversationId`, `isLoadingConversation`, `loadConversation(nodeId)`, and `saveConversation(nodeId, title)`.

Each component wraps `saveConversation` to pass its own nodeId/title. ChatPanel maps `null` nodeId to `'__global__'`.
