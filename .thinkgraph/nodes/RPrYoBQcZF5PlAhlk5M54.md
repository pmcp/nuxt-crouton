# Build node-level chat in ThinkGraph detail panel

## Summary
Added per-node conversation threads embedded in the node detail slideover with slash command support and conversation history integration during dispatch.

## Changes
- **New component**: `apps/thinkgraph/app/components/NodeChatPanel.vue` — Embedded chat panel for the slideover detail view
- **Modified**: `apps/thinkgraph/app/pages/admin/[team]/project/[projectId].vue` — Integrated NodeChatPanel, wired slash commands, included chat history in dispatch

## Features
- Per-node chat threads persisted via `chatconversations` collection
- Slash commands: `/break-down` and `/send-to-pi` trigger existing actions
- Action buttons in chat header for break-down and dispatch
- Conversation history (last 20 messages) automatically included when dispatching to Pi
- Conversation history included in respondAndRedispatch flow
