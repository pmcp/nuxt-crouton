import type { Ref, ComputedRef } from 'vue'

interface DependentFieldResolverOptions {
  valueId: string | Ref<string> | (() => string)
  parentId: string | Ref<string> | (() => string)
  parentCollection: string
  parentField: string
}

interface DependentFieldResolverReturn<T = any> {
  resolvedValue: ComputedRef<T | null>
  pending: Ref<boolean>
  error: Ref<any>
}

/**
 * Resolves a dependent field value from a parent collection's JSON array
 *
 * Use case: When a field stores an ID that references an object within a JSON array
 * in another collection. For example, a booking's "slot" field stores an ID that
 * references an object in a location's "slots" array.
 *
 * Features:
 * - Fetches the parent record using useCollectionItem
 * - Extracts the specified JSON array field
 * - Finds and returns the object with matching ID
 * - Fully reactive to parameter changes
 *
 * @example
 * // Resolve a booking's slot from a location's slots array
 * const { resolvedValue, pending } = await useDependentFieldResolver({
 *   valueId: 'tvmNIE0CGmS7uxQe0y0YM',
 *   parentId: 'location-123',
 *   parentCollection: 'bookingsLocations',
 *   parentField: 'slots'
 * })
 * // resolvedValue.value = { id: 'tvmNIE0CGmS7uxQe0y0YM', label: '123', value: '123' }
 *
 * @example
 * // With reactive values
 * const slotId = ref('tvmNIE0CGmS7uxQe0y0YM')
 * const locationId = ref('location-123')
 * const { resolvedValue, pending } = await useDependentFieldResolver({
 *   valueId: slotId,
 *   parentId: locationId,
 *   parentCollection: 'bookingsLocations',
 *   parentField: 'slots'
 * })
 */
export async function useDependentFieldResolver<T = any>(
  options: DependentFieldResolverOptions
): Promise<DependentFieldResolverReturn<T>> {
  const { valueId, parentId, parentCollection, parentField } = options

  // Convert all inputs to computed refs for reactivity
  const computedValueId = computed(() => {
    if (typeof valueId === 'function') return valueId()
    return unref(valueId)
  })

  const computedParentId = computed(() => {
    if (typeof parentId === 'function') return parentId()
    return unref(parentId)
  })

  // Fetch the parent item
  const { item: parentItem, pending, error } = await useCollectionItem(
    parentCollection,
    computedParentId
  )

  // Resolve the value from the parent's JSON array field
  const resolvedValue = computed(() => {
    if (!parentItem.value || !computedValueId.value) {
      return null
    }

    // Get the array field from the parent item
    const arrayField = parentItem.value[parentField]

    if (!Array.isArray(arrayField)) {
      console.warn(
        `[useDependentFieldResolver] Field "${parentField}" is not an array in parent record`,
        parentItem.value
      )
      return null
    }

    // Find the object with matching ID
    const found = arrayField.find((item: any) => item.id === computedValueId.value)

    if (!found) {
      console.warn(
        `[useDependentFieldResolver] No object found with id "${computedValueId.value}" in ${parentCollection}.${parentField}`,
        { arrayField, searchId: computedValueId.value }
      )
      return null
    }

    return found as T
  })

  return {
    resolvedValue,
    pending,
    error
  }
}
