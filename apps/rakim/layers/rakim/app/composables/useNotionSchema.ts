/**
 * Composable for fetching and managing Notion database schema
 *
 * Handles fetching database schema from Notion API and managing the result state.
 * Used for auto-generating field mappings and property type detection.
 *
 * @example
 * ```ts
 * const { fetchNotionSchema, schema, loading, error } = useNotionSchema()
 *
 * await fetchNotionSchema({
 *   databaseId: 'abc123',
 *   notionToken: 'secret_xyz'
 * })
 *
 * if (schema.value) {
 *   console.log('Properties:', schema.value.properties)
 *   console.log('Database title:', schema.value.databaseTitle)
 * }
 * ```
 */

export interface NotionProperty {
  name: string
  type: string
  options?: Array<{ name: string; color?: string }>
}

export interface NotionSchema {
  databaseTitle: string
  properties: Record<string, NotionProperty>
}

export interface FetchSchemaOptions {
  databaseId: string
  notionToken: string
}

// Create singleton refs outside the composable function
const fetchingSchema = ref(false)
const schemaFetchError = ref<string | null>(null)
const fetchedSchema = ref<NotionSchema | null>(null)

export function useNotionSchema() {

  /**
   * Fetch Notion database schema
   */
  async function fetchNotionSchema(options: FetchSchemaOptions): Promise<NotionSchema | null> {
    const { databaseId, notionToken } = options

    if (!databaseId || !notionToken) {
      schemaFetchError.value = 'Please provide both Notion Database ID and Integration Token'
      return null
    }

    fetchingSchema.value = true
    schemaFetchError.value = null

    try {
      const response = await $fetch<any>(`/api/notion/schema/${databaseId}`, {
        query: {
          notionToken
        }
      })

      if (response.success) {
        fetchedSchema.value = response
        return response
      } else {
        throw new Error(response.error || 'Failed to fetch schema')
      }
    } catch (error: any) {
      console.error('Failed to fetch schema:', error)
      schemaFetchError.value = error.data?.statusMessage || error.message || 'Failed to fetch schema'
      fetchedSchema.value = null
      return null
    } finally {
      fetchingSchema.value = false
    }
  }

  /**
   * Clear schema and error state
   */
  function clearSchema() {
    fetchedSchema.value = null
    schemaFetchError.value = null
  }

  return {
    /**
     * Fetch Notion database schema
     */
    fetchNotionSchema,

    /**
     * Clear schema state
     */
    clearSchema,

    /**
     * Fetched schema result
     */
    schema: fetchedSchema,

    /**
     * Whether schema is currently being fetched
     */
    loading: fetchingSchema,

    /**
     * Error message if schema fetch failed
     */
    error: schemaFetchError,
  }
}
