// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentArticle, NewContentArticle } from '../../types'
import * as categoriesSchema from '../../../../../shop/collections/categories/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllContentArticles(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const articles = await (db as any)
    .select({
      ...tables.contentArticles,
      categoryIdData: categoriesSchema.shopCategories,
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
    .leftJoin(categoriesSchema.shopCategories, eq(tables.contentArticles.categoryId, categoriesSchema.shopCategories.id))
    .leftJoin(ownerUser, eq(tables.contentArticles.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentArticles.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentArticles.updatedBy, updatedByUser.id))
    .where(eq(tables.contentArticles.teamId, teamId))
    .orderBy(desc(tables.contentArticles.createdAt))

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
      categoryIdData: categoriesSchema.shopCategories,
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
    .leftJoin(categoriesSchema.shopCategories, eq(tables.contentArticles.categoryId, categoriesSchema.shopCategories.id))
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
  ownerId: string,
  updates: Partial<ContentArticle>
) {
  const db = useDB()

  const [article] = await (db as any)
    .update(tables.contentArticles)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.contentArticles.id, recordId),
        eq(tables.contentArticles.teamId, teamId),
        eq(tables.contentArticles.owner, ownerId)
      )
    )
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
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.contentArticles)
    .where(
      and(
        eq(tables.contentArticles.id, recordId),
        eq(tables.contentArticles.teamId, teamId),
        eq(tables.contentArticles.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentArticle not found or unauthorized'
    })
  }

  return { success: true }
}