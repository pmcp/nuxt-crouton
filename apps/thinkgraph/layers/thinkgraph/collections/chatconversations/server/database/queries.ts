// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphChatConversation, NewThinkgraphChatConversation } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphChatConversations(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const chatConversations = await (db as any)
    .select({
      ...tables.thinkgraphChatConversations,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphChatConversations)
    .leftJoin(ownerUser, eq(tables.thinkgraphChatConversations.owner, ownerUser.id))
    .where(eq(tables.thinkgraphChatConversations.teamId, teamId))
    .orderBy(desc(tables.thinkgraphChatConversations.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  chatConversations.forEach((item: any) => {
      // Parse messages from JSON string
      if (typeof item.messages === 'string') {
        try {
          item.messages = JSON.parse(item.messages)
        } catch (e) {
          console.error('Error parsing messages:', e)
          item.messages = null
        }
      }
      if (item.messages === null || item.messages === undefined) {
        item.messages = null
      }
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return chatConversations
}

export async function getThinkgraphChatConversationsByIds(teamId: string, chatConversationIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const chatConversations = await (db as any)
    .select({
      ...tables.thinkgraphChatConversations,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphChatConversations)
    .leftJoin(ownerUser, eq(tables.thinkgraphChatConversations.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphChatConversations.teamId, teamId),
        inArray(tables.thinkgraphChatConversations.id, chatConversationIds)
      )
    )
    .orderBy(desc(tables.thinkgraphChatConversations.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  chatConversations.forEach((item: any) => {
      // Parse messages from JSON string
      if (typeof item.messages === 'string') {
        try {
          item.messages = JSON.parse(item.messages)
        } catch (e) {
          console.error('Error parsing messages:', e)
          item.messages = null
        }
      }
      if (item.messages === null || item.messages === undefined) {
        item.messages = null
      }
      // Parse metadata from JSON string
      if (typeof item.metadata === 'string') {
        try {
          item.metadata = JSON.parse(item.metadata)
        } catch (e) {
          console.error('Error parsing metadata:', e)
          item.metadata = null
        }
      }
      if (item.metadata === null || item.metadata === undefined) {
        item.metadata = null
      }
  })

  return chatConversations
}

export async function getThinkgraphChatConversationByNodeId(teamId: string, nodeId: string) {
  const db = useDB()

  const chatConversations = await (db as any)
    .select()
    .from(tables.thinkgraphChatConversations)
    .where(
      and(
        eq(tables.thinkgraphChatConversations.teamId, teamId),
        eq(tables.thinkgraphChatConversations.nodeId, nodeId)
      )
    )
    .orderBy(desc(tables.thinkgraphChatConversations.createdAt))
    .limit(1)

  const item = chatConversations[0] || null

  // Post-query processing for JSON fields
  if (item) {
    if (typeof item.messages === 'string') {
      try {
        item.messages = JSON.parse(item.messages)
      } catch (e) {
        console.error('Error parsing messages:', e)
        item.messages = null
      }
    }
    if (typeof item.metadata === 'string') {
      try {
        item.metadata = JSON.parse(item.metadata)
      } catch (e) {
        console.error('Error parsing metadata:', e)
        item.metadata = null
      }
    }
  }

  return item
}

export async function createThinkgraphChatConversation(data: NewThinkgraphChatConversation) {
  const db = useDB()

  const [chatConversation] = await (db as any)
    .insert(tables.thinkgraphChatConversations)
    .values(data)
    .returning()

  return chatConversation
}

export async function updateThinkgraphChatConversation(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphChatConversation>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphChatConversations.id, recordId),
    eq(tables.thinkgraphChatConversations.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphChatConversations.owner, userId))
  }

  const [chatConversation] = await (db as any)
    .update(tables.thinkgraphChatConversations)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!chatConversation) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphChatConversation not found or unauthorized'
    })
  }

  return chatConversation
}

export async function deleteThinkgraphChatConversation(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphChatConversations.id, recordId),
    eq(tables.thinkgraphChatConversations.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphChatConversations.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphChatConversations)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphChatConversation not found or unauthorized'
    })
  }

  return { success: true }
}