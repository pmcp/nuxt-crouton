import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  generateGetEndpoint,
  generatePostEndpoint,
  generatePatchEndpoint,
  generateDeleteEndpoint,
  generateMoveEndpoint,
  generateReorderEndpoint
} from '../../../lib/generators/api-endpoints.mjs'
import {
  apiEndpointData,
  apiWithHierarchyData,
  apiWithSortableData,
  apiWithDateData,
  minimalConfig,
  translationsConfig
} from '../../fixtures/sample-data.mjs'

// Type helper to work around .mjs module inference (config = null default)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyConfig = any

// Mock date to prevent snapshot failures due to timestamps
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-01-01'))
})

afterAll(() => {
  vi.useRealTimers()
})

describe('API Endpoint Generators', () => {
  describe('generateGetEndpoint', () => {
    it('generates correct output for basic collection', () => {
      const result = generateGetEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generateGetEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes queries import with correct naming', () => {
      const result = generateGetEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('import { getAllShopProducts, getShopProductsByIds }')
    })

    it('uses team-based queries', () => {
      const result = generateGetEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('resolveTeamAndCheckMembership(event)')
      expect(result).toContain('getAllShopProducts(team.id)')
      expect(result).toContain('getShopProductsByIds(team.id, ids)')
    })

    it('handles translations when configured', () => {
      const result = generateGetEndpoint(apiEndpointData, translationsConfig as AnyConfig)
      expect(result).toContain("const locale = String(query.locale || 'en')")
    })
  })

  describe('generatePostEndpoint', () => {
    it('generates correct output for basic collection', () => {
      const result = generatePostEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generatePostEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes create query import', () => {
      const result = generatePostEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('import { createShopProduct }')
    })

    it('sets teamId and user fields', () => {
      const result = generatePostEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('teamId: team.id')
      expect(result).toContain('owner: user.id')
      expect(result).toContain('createdBy: user.id')
      expect(result).toContain('updatedBy: user.id')
    })

    it('handles date field conversion', () => {
      const result = generatePostEndpoint(apiWithDateData, minimalConfig as AnyConfig)
      expect(result).toContain('new Date(dataWithoutId.publishedAt)')
      expect(result).toContain('new Date(dataWithoutId.expiresAt)')
    })
  })

  describe('generatePatchEndpoint', () => {
    it('generates correct output for basic collection', () => {
      const result = generatePatchEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generatePatchEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes update query import', () => {
      const result = generatePatchEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('import { updateShopProduct }')
    })

    it('validates required ID parameter', () => {
      const result = generatePatchEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("if (!productId)")
      expect(result).toContain("throw createError({ status: 400, statusText: 'Missing product ID' })")
    })

    it('handles date field conversion in updates', () => {
      const result = generatePatchEndpoint(apiWithDateData, minimalConfig as AnyConfig)
      expect(result).toContain('body.publishedAt ? new Date(body.publishedAt)')
    })

    it('includes translation merge logic when configured', () => {
      const result = generatePatchEndpoint(apiEndpointData, translationsConfig as AnyConfig)
      expect(result).toContain('body.translations')
      expect(result).toContain('existing.translations')
      expect(result).toContain('getShopProductsByIds')
    })
  })

  describe('generateDeleteEndpoint', () => {
    it('generates correct output for basic collection', () => {
      const result = generateDeleteEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generateDeleteEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes delete query import', () => {
      const result = generateDeleteEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain('import { deleteShopProduct }')
    })

    it('validates required ID parameter', () => {
      const result = generateDeleteEndpoint(apiEndpointData, minimalConfig as AnyConfig)
      expect(result).toContain("if (!productId)")
      expect(result).toContain("throw createError({ status: 400, statusText: 'Missing product ID' })")
    })
  })

  describe('generateMoveEndpoint', () => {
    it('generates correct output for hierarchy collection', () => {
      const result = generateMoveEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generateMoveEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes updatePosition query import', () => {
      const result = generateMoveEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain('import { updatePositionShopCategory }')
    })

    it('validates order parameter', () => {
      const result = generateMoveEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain('body.order === undefined')
      expect(result).toContain("typeof body.order !== 'number'")
      expect(result).toContain("'order is required and must be a number'")
    })

    it('handles parentId being null for root items', () => {
      const result = generateMoveEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain('const parentId = body.parentId ?? null')
    })
  })

  describe('generateReorderEndpoint', () => {
    it('generates correct output for hierarchy collection', () => {
      const result = generateReorderEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('generates correct output for sortable collection', () => {
      const result = generateReorderEndpoint(apiWithSortableData, minimalConfig as AnyConfig)
      expect(result).toMatchSnapshot()
    })

    it('includes team auth import', () => {
      const result = generateReorderEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain("import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'")
    })

    it('includes reorderSiblings query import', () => {
      const result = generateReorderEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain('import { reorderSiblingsShopCategories }')
    })

    it('validates updates array parameter', () => {
      const result = generateReorderEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain("if (!Array.isArray(body.updates))")
      expect(result).toContain("'updates must be an array'")
    })

    it('validates each update has id and order', () => {
      const result = generateReorderEndpoint(apiWithHierarchyData, minimalConfig as AnyConfig)
      expect(result).toContain('!update.id')
      expect(result).toContain("typeof update.order !== 'number'")
    })
  })
})
