// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentArticle, NewContentArticle } from '../../types'
import { user } from '~~/server/db/schema'
import * as tagsSchema from '../../../tags/server/database/schema'

export async function getAllContentArticles(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const articles = await (db as any)
    .select({
      ...tables.contentArticles,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.contentArticles)
    .leftJoin(ownerUser, eq(tables.contentArticles.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentArticles.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentArticles.updatedBy, updatedByUser.id))
    .where(eq(tables.contentArticles.teamId, teamId))
    .orderBy(desc(tables.contentArticles.createdAt))

  // Post-query processing for array references
  if (articles.length > 0) {
    // Post-process array references to tags
    const allTagsIds = new Set()
    articles.forEach(item => {
        if (item.tags) {
          try {
            const ids = typeof item.tags === 'string'
              ? JSON.parse(item.tags)
              : item.tags
            if (Array.isArray(ids)) {
              ids.forEach(id => allTagsIds.add(id))
            }
          } catch (e) {
            // Handle parsing errors gracefully
            console.error('Error parsing tags:', e)
          }
        }
      })

    if (allTagsIds.size > 0) {
      const relatedTags = await db
        .select()
        .from(tagsSchema.contentTags)
        .where(inArray(tagsSchema.contentTags.id, Array.from(allTagsIds)))

      articles.forEach(item => {
        item.tagsData = []
        if (item.tags) {
          try {
            const ids = typeof item.tags === 'string'
              ? JSON.parse(item.tags)
              : item.tags
            if (Array.isArray(ids)) {
              item.tagsData = relatedTags.filter(r => ids.includes(r.id))
            }
          } catch (e) {
            console.error('Error mapping tags:', e)
          }
        }
      })
    }
  }

  return articles
}

export async function getContentArticlesByIds(teamId: string, articleIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const articles = await (db as any)
    .select({
      ...tables.contentArticles,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.contentArticles)
    .leftJoin(ownerUser, eq(tables.contentArticles.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentArticles.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentArticles.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentArticles.teamId, teamId),
        inArray(tables.contentArticles.id, articleIds)
      )
    )
    .orderBy(desc(tables.contentArticles.createdAt))

  // Post-query processing for array references
  if (articles.length > 0) {
    // Post-process array references to tags
    const allTagsIds = new Set()
    articles.forEach(item => {
        if (item.tags) {
          try {
            const ids = typeof item.tags === 'string'
              ? JSON.parse(item.tags)
              : item.tags
            if (Array.isArray(ids)) {
              ids.forEach(id => allTagsIds.add(id))
            }
          } catch (e) {
            // Handle parsing errors gracefully
            console.error('Error parsing tags:', e)
          }
        }
      })

    if (allTagsIds.size > 0) {
      const relatedTags = await db
        .select()
        .from(tagsSchema.contentTags)
        .where(inArray(tagsSchema.contentTags.id, Array.from(allTagsIds)))

      articles.forEach(item => {
        item.tagsData = []
        if (item.tags) {
          try {
            const ids = typeof item.tags === 'string'
              ? JSON.parse(item.tags)
              : item.tags
            if (Array.isArray(ids)) {
              item.tagsData = relatedTags.filter(r => ids.includes(r.id))
            }
          } catch (e) {
            console.error('Error mapping tags:', e)
          }
        }
      })
    }
  }

  return articles
}

export async function createContentArticle(data: NewContentArticle) {
  const db = useDB()

  const [article] = await (db as any)
    .insert(tables.contentArticles)
    .values(data)
    .returning()

  return article
}

export async function updateContentArticle(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentArticle>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentArticles.id, recordId),
    eq(tables.contentArticles.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentArticles.owner, userId))
  }

  const [article] = await (db as any)
    .update(tables.contentArticles)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!article) {
    throw createError({
      status: 404,
      statusText: 'ContentArticle not found or unauthorized'
    })
  }

  return article
}

export async function deleteContentArticle(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentArticles.id, recordId),
    eq(tables.contentArticles.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentArticles.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentArticles)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentArticle not found or unauthorized'
    })
  }

  return { success: true }
}