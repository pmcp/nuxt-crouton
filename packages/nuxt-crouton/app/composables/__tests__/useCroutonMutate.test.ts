import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock useCollectionMutation
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDeleteItems = vi.fn()

vi.stubGlobal('useCollectionMutation', (collection: string) => ({
  create: mockCreate,
  update: mockUpdate,
  deleteItems: mockDeleteItems
}))

// Mock console.log to avoid noise in tests
vi.stubGlobal('console', {
  ...console,
  log: vi.fn()
})

// Import after mocking
import { useCroutonMutate } from '../useCroutonMutate'

describe('useCroutonMutate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ id: 'new-id', name: 'Created' })
    mockUpdate.mockResolvedValue({ id: '123', name: 'Updated' })
    mockDeleteItems.mockResolvedValue(undefined)
  })

  describe('initialization', () => {
    it('returns mutate function', () => {
      const { mutate } = useCroutonMutate()
      expect(mutate).toBeDefined()
      expect(typeof mutate).toBe('function')
    })
  })

  describe('create action', () => {
    it('calls create with provided data', async () => {
      const { mutate } = useCroutonMutate()
      const data = { name: 'New Item', value: 100 }

      await mutate('create', 'products', data)

      expect(mockCreate).toHaveBeenCalledWith(data)
    })

    it('returns result from create', async () => {
      const { mutate } = useCroutonMutate()
      mockCreate.mockResolvedValue({ id: 'created-1', name: 'Test' })

      const result = await mutate('create', 'products', { name: 'Test' })

      expect(result).toEqual({ id: 'created-1', name: 'Test' })
    })

    it('works with any collection name', async () => {
      const { mutate } = useCroutonMutate()

      await mutate('create', 'adminRoles', { name: 'Admin Role' })
      await mutate('create', 'categories', { name: 'Category' })

      expect(mockCreate).toHaveBeenCalledTimes(2)
    })
  })

  describe('update action', () => {
    it('calls update with id and data', async () => {
      const { mutate } = useCroutonMutate()
      const data = { id: '123', name: 'Updated Name' }

      await mutate('update', 'products', data)

      expect(mockUpdate).toHaveBeenCalledWith('123', data)
    })

    it('throws error when data.id is missing', async () => {
      const { mutate } = useCroutonMutate()
      const data = { name: 'No ID' }

      await expect(mutate('update', 'products', data)).rejects.toThrow('Update requires data.id')
    })

    it('returns result from update', async () => {
      const { mutate } = useCroutonMutate()
      mockUpdate.mockResolvedValue({ id: '123', name: 'Updated Value' })

      const result = await mutate('update', 'products', { id: '123', name: 'Test' })

      expect(result).toEqual({ id: '123', name: 'Updated Value' })
    })
  })

  describe('delete action', () => {
    it('calls deleteItems with array of ids', async () => {
      const { mutate } = useCroutonMutate()
      const ids = ['id1', 'id2', 'id3']

      await mutate('delete', 'products', ids)

      expect(mockDeleteItems).toHaveBeenCalledWith(ids)
    })

    it('wraps single id in array', async () => {
      const { mutate } = useCroutonMutate()

      await mutate('delete', 'products', 'single-id')

      expect(mockDeleteItems).toHaveBeenCalledWith(['single-id'])
    })

    it('handles empty array', async () => {
      const { mutate } = useCroutonMutate()

      await mutate('delete', 'products', [])

      expect(mockDeleteItems).toHaveBeenCalledWith([])
    })
  })

  describe('unknown action', () => {
    it('throws error for unknown actions', async () => {
      const { mutate } = useCroutonMutate()

      await expect(mutate('unknown' as any, 'products', {})).rejects.toThrow('Unknown action: unknown')
    })
  })

  describe('error propagation', () => {
    it('propagates create errors', async () => {
      const { mutate } = useCroutonMutate()
      mockCreate.mockRejectedValue(new Error('Create failed'))

      await expect(mutate('create', 'products', {})).rejects.toThrow('Create failed')
    })

    it('propagates update errors', async () => {
      const { mutate } = useCroutonMutate()
      mockUpdate.mockRejectedValue(new Error('Update failed'))

      await expect(mutate('update', 'products', { id: '123' })).rejects.toThrow('Update failed')
    })

    it('propagates delete errors', async () => {
      const { mutate } = useCroutonMutate()
      mockDeleteItems.mockRejectedValue(new Error('Delete failed'))

      await expect(mutate('delete', 'products', ['id1'])).rejects.toThrow('Delete failed')
    })
  })

  describe('console logging', () => {
    it('logs mutation info', async () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const { mutate } = useCroutonMutate()

      await mutate('create', 'testCollection', { test: true })

      expect(consoleSpy).toHaveBeenCalledWith(
        '[useCroutonMutate]',
        'create',
        'testCollection',
        { test: true }
      )
    })
  })
})
