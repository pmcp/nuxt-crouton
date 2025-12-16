import { z } from 'zod'

/**
 * Chat message schema for individual messages in a conversation.
 */
export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  createdAt: z.string().datetime()
})

export type ChatMessage = z.infer<typeof chatMessageSchema>

/**
 * Schema for chat conversations collection.
 *
 * This schema defines the structure for persisting AI chat conversations.
 * It's designed to work with the crouton collection generator.
 *
 * ## Usage with Generator
 *
 * ### Option 1: Using the JSON schema directly
 * ```bash
 * pnpm crouton ai chatConversations --fields-file=node_modules/@crouton/ai/schemas/chat-conversations.json
 * ```
 *
 * ### Option 2: Using a config file
 * ```javascript
 * // crouton.config.js
 * export default {
 *   collections: [
 *     {
 *       name: 'chatConversations',
 *       fieldsFile: 'node_modules/@crouton/ai/schemas/chat-conversations.json'
 *     }
 *   ],
 *   targets: [
 *     { layer: 'ai', collections: ['chatConversations'] }
 *   ]
 * }
 * ```
 *
 * ## Fields
 *
 * - `title` - Optional conversation title (auto-generated or user-defined)
 * - `messages` - JSON array of chat messages (see ChatMessage type)
 * - `provider` - AI provider identifier (openai, anthropic, etc.)
 * - `model` - Model identifier (gpt-4o, claude-sonnet-4, etc.)
 * - `systemPrompt` - System prompt used for this conversation
 * - `metadata` - Additional metadata (token counts, tags, etc.)
 * - `messageCount` - Cached message count for quick display
 * - `lastMessageAt` - Timestamp of last message for sorting
 *
 * ## Auto-generated Fields
 *
 * The generator will also add:
 * - `id` - Primary key (uuid/nanoid)
 * - `teamId` - Team association
 * - `userId` - User who created the conversation
 * - `createdAt`, `updatedAt` - Timestamps
 * - `createdBy`, `updatedBy` - User tracking
 */
export const chatConversationsSchema = {
  name: 'chatConversations',

  /**
   * Zod validation schema for the conversation data.
   */
  schema: z.object({
    id: z.string().uuid(),
    teamId: z.string(),
    userId: z.string(),
    title: z.string().max(255).optional(),
    messages: z.array(chatMessageSchema),
    provider: z.string().max(50).optional(),
    model: z.string().max(100).optional(),
    systemPrompt: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
    messageCount: z.number().int().min(0).optional(),
    lastMessageAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime()
  }),

  /**
   * Collection configuration hints for the generator.
   */
  config: {
    /** Collection is scoped to teams */
    scope: 'team' as const,
    /** No soft delete needed for conversations */
    softDelete: false,
    /** Auto-manage timestamps */
    timestamps: true
  }
}

export type ChatConversation = z.infer<typeof chatConversationsSchema['schema']>
export type NewChatConversation = Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>

export default chatConversationsSchema
