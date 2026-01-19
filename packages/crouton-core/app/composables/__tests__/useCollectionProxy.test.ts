import { describe, it, expect } from 'vitest'
import { useCollectionProxy } from '../useCollectionProxy'

describe('useCollectionProxy', () => {
  const { applyTransform, getProxiedEndpoint } = useCollectionProxy()

  describe('applyTransform', () => {
    it('should return data as-is when no proxy config', () => {
      const data = [{ id: '1', name: 'Test' }]
      const config = {}

      const result = applyTransform(data, config)

      expect(result).toEqual(data)
    })

    it('should return data as-is when proxy not enabled', () => {
      const data = [{ id: '1', name: 'Test' }]
      const config = { proxy: { enabled: false } }

      const result = applyTransform(data, config)

      expect(result).toEqual(data)
    })

    it('should transform array of items', () => {
      const data = [
        { userId: '1', name: 'Alice' },
        { userId: '2', name: 'Bob' }
      ]
      const config = {
        proxy: {
          enabled: true,
          sourceEndpoint: 'members',
          transform: (item: any) => ({
            id: item.userId,
            title: item.name
          })
        }
      }

      const result = applyTransform(data, config)

      expect(result).toEqual([
        { id: '1', title: 'Alice' },
        { id: '2', title: 'Bob' }
      ])
    })

    it('should transform single item', () => {
      const data = { userId: '1', name: 'Alice' }
      const config = {
        proxy: {
          enabled: true,
          sourceEndpoint: 'members',
          transform: (item: any) => ({
            id: item.userId,
            title: item.name
          })
        }
      }

      const result = applyTransform(data, config)

      expect(result).toEqual({ id: '1', title: 'Alice' })
    })
  })

  describe('getProxiedEndpoint', () => {
    it('should return apiPath when no proxy config', () => {
      const config = {}
      const result = getProxiedEndpoint(config, 'users')

      expect(result).toBe('users')
    })

    it('should return apiPath when proxy not enabled', () => {
      const config = { proxy: { enabled: false } }
      const result = getProxiedEndpoint(config, 'users')

      expect(result).toBe('users')
    })

    it('should return sourceEndpoint when proxy enabled', () => {
      const config = {
        proxy: {
          enabled: true,
          sourceEndpoint: 'members'
        }
      }
      const result = getProxiedEndpoint(config, 'users')

      expect(result).toBe('members')
    })
  })
})
