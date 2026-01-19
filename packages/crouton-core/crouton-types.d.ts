/**
 * Type declarations for #crouton/types module alias
 *
 * This enables TypeScript to understand the module augmentation pattern
 * used by generated collection types (types/crouton-collections.d.ts).
 *
 * Apps augment CollectionTypeMap to register their collection types:
 *
 * @example
 * declare module '#crouton/types' {
 *   interface CollectionTypeMap {
 *     blogPosts: {
 *       Item: BlogPost
 *       FormData: BlogPostFormData
 *       NewItem: NewBlogPost
 *     }
 *   }
 * }
 */
declare module '#crouton/types' {
  /**
   * Base interface for collection type mapping.
   * Augmented by generated code to add type-safe collection definitions.
   */
  export interface CollectionTypeMap {
    // Empty by default - augmented by generated collection types
  }

  /**
   * Type-safe collection name (union of all registered collections)
   */
  export type CollectionName = keyof CollectionTypeMap

  /**
   * Get the Item type for a registered collection
   */
  export type CollectionItem<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['Item']

  /**
   * Get the FormData type for a registered collection
   */
  export type CollectionFormData<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['FormData']

  /**
   * Get the NewItem type for a registered collection
   */
  export type CollectionNewItem<K extends keyof CollectionTypeMap> = CollectionTypeMap[K]['NewItem']

  /**
   * Collection type definition structure
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
}
