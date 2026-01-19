/**
 * Collection Type Registry
 *
 * This module provides type-safe collection definitions that connect
 * collection names to their types. The CollectionTypeMap interface
 * is designed to be augmented by generated collection code.
 *
 * @example
 * // In generated types/crouton-collections.d.ts:
 * declare module '#crouton/types' {
 *   interface CollectionTypeMap {
 *     blogPosts: {
 *       Item: BlogPost
 *       FormData: BlogPostFormData
 *       NewItem: NewBlogPost
 *     }
 *   }
 * }
 *
 * @example
 * // Usage in composables:
 * const { items } = await useCollectionQuery('blogPosts')
 * // items is automatically typed as ComputedRef<BlogPost[]>
 */

/**
 * Base interface for collection type mapping.
 * This interface is augmented by generated code to add type-safe collection definitions.
 *
 * Each collection entry should have:
 * - Item: The full item type (with all fields)
 * - FormData: The form/input type (validated by Zod schema)
 * - NewItem: The type for creating new items (without auto-generated fields)
 */
export interface CollectionTypeMap {
  // Empty by default - augmented by generated collection types
  // This allows TypeScript to infer the available collection names
}

/**
 * Type-safe collection name (union of all registered collections)
 * Only registered collections are allowed - no string fallback
 */
export type CollectionName = keyof CollectionTypeMap

/**
 * Get the Item type for a registered collection
 * Only works with registered collections
 */
export type CollectionItem<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['Item']

/**
 * Get the FormData type for a registered collection
 * Only works with registered collections
 */
export type CollectionFormData<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['FormData']

/**
 * Get the NewItem type for a registered collection
 * Only works with registered collections
 */
export type CollectionNewItem<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['NewItem']

/**
 * Collection type definition structure
 * Used internally to ensure consistent type registration
 */
export interface CollectionTypeDefinition<
  TItem = any,
  TFormData = any,
  TNewItem = any
> {
  Item: TItem
  FormData: TFormData
  NewItem: TNewItem
}
