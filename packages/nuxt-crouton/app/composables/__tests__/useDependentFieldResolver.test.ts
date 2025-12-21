import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, unref } from 'vue'

// Mock dependencies
const mockPending = ref(false)
const mockError = ref(null)
const mockParentItem = ref<any>(null)

vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('unref', unref)

vi.stubGlobal('useCollectionItem', vi.fn(async () => ({
  item: computed(() => mockParentItem.value),
  pending: mockPending,
  error: mockError
})))

// Mock console
vi.stubGlobal('console', {
  ...console,
  warn: vi.fn()
})

// Import after mocking
import { useDependentFieldResolver } from '../useDependentFieldResolver'

describe('useDependentFieldResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockParentItem.value = null
    mockPending.value = false
    mockError.value = null
  })

  describe('initialization', () => {
    it('returns resolvedValue, pending, and error', async () => {
      const result = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(result.resolvedValue).toBeDefined()
      expect(result.pending).toBeDefined()
      expect(result.error).toBeDefined()
    })

    it('calls useCollectionItem with correct parameters', async () => {
      const mockUseCollectionItem = vi.mocked(global.useCollectionItem as any)

      await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(mockUseCollectionItem).toHaveBeenCalledWith(
        'locations',
        expect.any(Object) // computed ref
      )
    })
  })

  describe('resolving value from parent array', () => {
    it('resolves value when parent item has matching array element', async () => {
      mockParentItem.value = {
        id: 'location-1',
        name: 'Test Location',
        slots: [
          { id: 'slot-1', label: 'Morning', value: '09:00' },
          { id: 'slot-2', label: 'Afternoon', value: '14:00' }
        ]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({ id: 'slot-1', label: 'Morning', value: '09:00' })
    })

    it('returns null when value not found in array', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [
          { id: 'slot-1', label: 'Morning' }
        ]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'non-existent',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toBeNull()
    })

    it('returns null when parent item is null', async () => {
      mockParentItem.value = null

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toBeNull()
    })

    it('returns null when valueId is empty', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Test' }]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: '',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toBeNull()
    })
  })

  describe('non-array field handling', () => {
    it('returns null and warns when field is not an array', async () => {
      const consoleWarn = vi.spyOn(console, 'warn')
      mockParentItem.value = {
        id: 'location-1',
        slots: 'not-an-array' // Wrong type
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toBeNull()
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Field "slots" is not an array'),
        expect.any(Object)
      )
    })

    it('returns null when field does not exist', async () => {
      mockParentItem.value = {
        id: 'location-1'
        // slots field missing
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toBeNull()
    })
  })

  describe('reactive parameters', () => {
    it('handles ref valueId', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Test' }]
      }
      const valueIdRef = ref('slot-1')

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: valueIdRef,
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({ id: 'slot-1', label: 'Test' })
    })

    it('handles function valueId', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Test' }]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: () => 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({ id: 'slot-1', label: 'Test' })
    })

    it('handles ref parentId', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Test' }]
      }
      const parentIdRef = ref('location-1')

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: parentIdRef,
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({ id: 'slot-1', label: 'Test' })
    })

    it('handles function parentId', async () => {
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Test' }]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: () => 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({ id: 'slot-1', label: 'Test' })
    })
  })

  describe('error and pending propagation', () => {
    it('propagates pending state from useCollectionItem', async () => {
      mockPending.value = true

      const { pending } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(pending.value).toBe(true)
    })

    it('propagates error state from useCollectionItem', async () => {
      mockError.value = new Error('Fetch failed')

      const { error } = await useDependentFieldResolver({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      expect(error.value).toBeInstanceOf(Error)
    })
  })

  describe('warning messages', () => {
    it('warns when value not found in array', async () => {
      const consoleWarn = vi.spyOn(console, 'warn')
      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1' }]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'not-found',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      // Access resolvedValue.value to trigger the computed
      const _ = resolvedValue.value

      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('No object found with id "not-found"'),
        expect.any(Object)
      )
    })
  })

  describe('type inference', () => {
    it('returns typed resolvedValue', async () => {
      interface Slot {
        id: string
        label: string
        time: string
      }

      mockParentItem.value = {
        id: 'location-1',
        slots: [{ id: 'slot-1', label: 'Morning', time: '09:00' }]
      }

      const { resolvedValue } = await useDependentFieldResolver<Slot>({
        valueId: 'slot-1',
        parentId: 'location-1',
        parentCollection: 'locations',
        parentField: 'slots'
      })

      // TypeScript should infer the type correctly
      expect(resolvedValue.value?.id).toBe('slot-1')
      expect(resolvedValue.value?.label).toBe('Morning')
    })
  })

  describe('real-world use case', () => {
    it('resolves booking slot from location', async () => {
      // Simulate a location with time slots
      mockParentItem.value = {
        id: 'location-123',
        name: 'Main Office',
        address: '123 Main St',
        slots: [
          { id: 'tvmNIE0CGmS7uxQe0y0YM', label: '9 AM', value: '09:00' },
          { id: 'abc123', label: '10 AM', value: '10:00' },
          { id: 'def456', label: '11 AM', value: '11:00' }
        ]
      }

      const { resolvedValue } = await useDependentFieldResolver({
        valueId: 'tvmNIE0CGmS7uxQe0y0YM',
        parentId: 'location-123',
        parentCollection: 'bookingsLocations',
        parentField: 'slots'
      })

      expect(resolvedValue.value).toEqual({
        id: 'tvmNIE0CGmS7uxQe0y0YM',
        label: '9 AM',
        value: '09:00'
      })
    })
  })
})
