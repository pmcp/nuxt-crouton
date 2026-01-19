import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PATH_CONFIG, getImportPath } from '../../../lib/utils/paths.mjs'

describe('PATH_CONFIG', () => {
  describe('patterns', () => {
    it('has layer alias patterns for API imports', () => {
      expect(PATH_CONFIG.patterns.fromApiToQueries).toContain('#layers/')
      expect(PATH_CONFIG.patterns.fromApiToSchema).toContain('#layers/')
      expect(PATH_CONFIG.patterns.fromApiToTypes).toContain('#layers/')
    })

    it('has layer alias patterns for component imports', () => {
      expect(PATH_CONFIG.patterns.fromComponentToTypes).toContain('#layers/')
      expect(PATH_CONFIG.patterns.fromComponentToComposables).toContain('#layers/')
    })

    it('has layer alias patterns for types imports', () => {
      expect(PATH_CONFIG.patterns.fromTypesToComposable).toContain('#layers/')
    })

    it('has layer alias patterns for queries imports', () => {
      expect(PATH_CONFIG.patterns.fromQueriesToTypes).toContain('#layers/')
    })

    it('has fallback relative paths', () => {
      expect(PATH_CONFIG.patterns.fallback.fromApiToQueries).toBe('../../../../database/queries')
      expect(PATH_CONFIG.patterns.fallback.fromApiToSchema).toBe('../../../../database/schema')
      expect(PATH_CONFIG.patterns.fallback.fromApiToTypes).toBe('../../../../../../types')
      expect(PATH_CONFIG.patterns.fallback.fromComponentToTypes).toBe('../../types')
      expect(PATH_CONFIG.patterns.fallback.fromQueriesToTypes).toBe('../types')
    })
  })

  describe('resolve', () => {
    it('replaces single variable in pattern', () => {
      const pattern = '#layers/{layerName}/test'
      const result = PATH_CONFIG.resolve(pattern, { layerName: 'blog' })
      expect(result).toBe('#layers/blog/test')
    })

    it('replaces multiple variables in pattern', () => {
      const pattern = '#layers/{layerName}-{collectionName}/server'
      const result = PATH_CONFIG.resolve(pattern, {
        layerName: 'shop',
        collectionName: 'products'
      })
      expect(result).toBe('#layers/shop-products/server')
    })

    it('handles variables appearing multiple times', () => {
      const pattern = '{name}/{name}/{name}'
      const result = PATH_CONFIG.resolve(pattern, { name: 'test' })
      expect(result).toBe('test/test/test')
    })

    it('warns on missing variable and preserves placeholder', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const pattern = '#layers/{layerName}-{collectionName}/test'
      const result = PATH_CONFIG.resolve(pattern, { layerName: 'blog' })

      expect(result).toBe('#layers/blog-{collectionName}/test')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Warning: Variable collectionName not provided for path pattern'
      )

      consoleSpy.mockRestore()
    })

    it('handles empty variables object', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const pattern = '#layers/{layerName}/test'
      const result = PATH_CONFIG.resolve(pattern, {})

      expect(result).toBe('#layers/{layerName}/test')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('handles pattern with no variables', () => {
      const pattern = 'simple/path/no/variables'
      const result = PATH_CONFIG.resolve(pattern, { unused: 'value' })
      expect(result).toBe('simple/path/no/variables')
    })

    it('defaults to empty object when variables not provided', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const pattern = '#layers/{layerName}/test'
      const result = PATH_CONFIG.resolve(pattern)

      expect(result).toBe('#layers/{layerName}/test')

      consoleSpy.mockRestore()
    })
  })

  describe('getImportPath', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('returns layer alias path when useLayerAliases is true', () => {
      const result = PATH_CONFIG.getImportPath('fromApiToQueries', {
        layerName: 'blog',
        collectionName: 'posts'
      }, true)

      expect(result).toBe('#layers/blog-posts/server/database/queries')
    })

    it('returns fallback path when useLayerAliases is false', () => {
      const result = PATH_CONFIG.getImportPath('fromApiToQueries', {}, false)
      expect(result).toBe('../../../../database/queries')
    })

    it('defaults to using layer aliases', () => {
      const result = PATH_CONFIG.getImportPath('fromComponentToTypes', {
        layerName: 'shop',
        collectionName: 'products'
      })

      expect(result).toBe('#layers/shop-products/types')
    })

    it('resolves fromApiToSchema pattern correctly', () => {
      const result = PATH_CONFIG.getImportPath('fromApiToSchema', {
        layerName: 'inventory',
        collectionName: 'items'
      })

      expect(result).toBe('#layers/inventory-items/server/database/schema')
    })

    it('resolves fromComponentToComposables pattern with composable name', () => {
      const result = PATH_CONFIG.getImportPath('fromComponentToComposables', {
        layerName: 'blog',
        collectionName: 'posts',
        composableName: 'useBlogPosts'
      })

      expect(result).toBe('#layers/blog-posts/app/composables/useBlogPosts')
    })

    it('resolves fromTypesToComposable pattern', () => {
      const result = PATH_CONFIG.getImportPath('fromTypesToComposable', {
        layerName: 'shop',
        collectionName: 'orders',
        composableName: 'useShopOrders'
      })

      expect(result).toBe('#layers/shop-orders/app/composables/useShopOrders')
    })

    it('resolves fromQueriesToTypes pattern', () => {
      const result = PATH_CONFIG.getImportPath('fromQueriesToTypes', {
        layerName: 'auth',
        collectionName: 'users'
      })

      expect(result).toBe('#layers/auth-users/types')
    })

    it('logs error for unknown path key and returns fallback', () => {
      const result = PATH_CONFIG.getImportPath('unknownPathKey', {})

      expect(consoleErrorSpy).toHaveBeenCalledWith('Unknown path key: unknownPathKey')
      expect(result).toBe('')
    })

    it('returns fallback path for unknown key when fallback exists', () => {
      // Add a fallback temporarily for test
      const originalFallback = PATH_CONFIG.patterns.fallback
      PATH_CONFIG.patterns.fallback = {
        ...originalFallback,
        unknownKey: '../../unknown'
      } as typeof originalFallback

      const result = PATH_CONFIG.getImportPath('unknownKey', {})

      expect(result).toBe('../../unknown')

      // Restore
      PATH_CONFIG.patterns.fallback = originalFallback
    })

    it('skips variable substitution when using fallback paths', () => {
      const result = PATH_CONFIG.getImportPath('fromApiToQueries', {
        layerName: 'blog',
        collectionName: 'posts'
      }, false)

      // Variables should be ignored for fallback
      expect(result).toBe('../../../../database/queries')
      expect(result).not.toContain('blog')
      expect(result).not.toContain('posts')
    })
  })

  describe('getLayerName', () => {
    it('concatenates layer and collection with hyphen', () => {
      const result = PATH_CONFIG.getLayerName('blog', 'posts')
      expect(result).toBe('blog-posts')
    })

    it('handles single word names', () => {
      const result = PATH_CONFIG.getLayerName('core', 'users')
      expect(result).toBe('core-users')
    })

    it('handles kebab-case inputs', () => {
      const result = PATH_CONFIG.getLayerName('user-management', 'team-members')
      expect(result).toBe('user-management-team-members')
    })

    it('handles empty strings', () => {
      const result = PATH_CONFIG.getLayerName('', 'collection')
      expect(result).toBe('-collection')
    })
  })
})

describe('getImportPath (exported function)', () => {
  it('delegates to PATH_CONFIG.getImportPath', () => {
    const result = getImportPath('fromApiToQueries', {
      layerName: 'shop',
      collectionName: 'products'
    }, true)

    expect(result).toBe('#layers/shop-products/server/database/queries')
  })

  it('uses default parameters correctly', () => {
    const result = getImportPath('fromComponentToTypes', {
      layerName: 'blog',
      collectionName: 'posts'
    })

    expect(result).toBe('#layers/blog-posts/types')
  })

  it('can request fallback paths', () => {
    const result = getImportPath('fromApiToSchema', {}, false)
    expect(result).toBe('../../../../database/schema')
  })
})
