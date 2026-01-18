/**
 * Convenience wrapper for quick mutations without setup
 * Use this when you need one-off mutations from anywhere in your app
 *
 * @example
 * // Quick create from anywhere
 * const { mutate } = useCroutonMutate()
 * await mutate('create', 'adminRoles', { name: 'New Role' })
 *
 * @example
 * // Quick update
 * await mutate('update', 'adminRoles', { id: '123', name: 'Updated' })
 *
 * @example
 * // Quick delete
 * await mutate('delete', 'adminRoles', ['id1', 'id2'])
 */
export function useCroutonMutate() {
  /**
   * Perform a mutation on any collection
   * @param action - 'create' | 'update' | 'delete'
   * @param collection - Collection name (e.g., 'adminRoles')
   * @param data - Data for create/update, or array of IDs for delete
   */
  const mutate = async (
    action: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ) => {
    const { create, update, deleteItems } = useCollectionMutation(collection)

    if (action === 'create') {
      return await create(data)
    }

    if (action === 'update') {
      if (!data.id) {
        throw new Error('Update requires data.id')
      }
      return await update(data.id, data)
    }

    if (action === 'delete') {
      const ids = Array.isArray(data) ? data : [data]
      return await deleteItems(ids)
    }

    throw new Error(`Unknown action: ${action}`)
  }

  return { mutate }
}
