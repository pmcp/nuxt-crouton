/**
 * Server-side Scoped Access Token Tests
 *
 * Tests the scoped access token utilities for:
 * - Token creation
 * - Token validation
 * - Token revocation
 * - Resource-scoped access
 * - Token lifecycle management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { H3Event } from 'h3'

// Track values for assertions
let lastInsertedValues: Record<string, unknown> | null = null
let selectResults: unknown[] = []
let updateRowsAffected = 1
let deleteRowsAffected = 0

// Mock database factory - returns chainable mock
const createMockDb = () => ({
  insert: vi.fn(() => ({
    values: vi.fn(async (data) => {
      lastInsertedValues = data
      return { rowsAffected: 1 }
    })
  })),
  select: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn(async () => selectResults)
  })),
  update: vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    where: vi.fn(async () => ({ rowsAffected: updateRowsAffected }))
  })),
  delete: vi.fn(() => ({
    where: vi.fn(async () => ({ rowsAffected: deleteRowsAffected }))
  }))
})

let mockDb = createMockDb()

// Setup global mocks
vi.stubGlobal('useDB', () => mockDb)

vi.stubGlobal('createError', (options: { statusCode?: number, statusMessage?: string, status?: number, statusText?: string }) => {
  // Support both old (statusCode/statusMessage) and new (status/statusText) Nitro v3 patterns
  const message = options.statusText || options.statusMessage || ''
  const code = options.status || options.statusCode || 500
  const error = new Error(message) as Error & { statusCode: number }
  error.statusCode = code
  return error
})

vi.stubGlobal('getCookie', vi.fn())
vi.stubGlobal('getHeader', vi.fn())

// Mock crypto for token generation
vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  })
})

// Import after mocks
import {
  createScopedToken,
  validateScopedToken,
  validateScopedTokenFromEvent,
  requireScopedAccess,
  requireScopedAccessToResource,
  revokeScopedToken,
  revokeScopedTokensForResource,
  findExistingScopedToken,
  listScopedTokensForResource,
  extendScopedToken,
  cleanupExpiredScopedTokens
} from '../../../server/utils/scoped-access'

// Helper to create mock H3Event
const createMockEvent = (overrides = {}): H3Event => ({
  node: { req: {}, res: {} },
  headers: new Headers(),
  context: {},
  ...overrides
}) as unknown as H3Event

// Helper to create valid token record
const createMockTokenRecord = (overrides = {}) => ({
  id: 'token-id-1',
  organizationId: 'org-123',
  token: 'test-token',
  resourceType: 'event',
  resourceId: 'event-456',
  displayName: 'Test Helper',
  role: 'helper',
  isActive: true,
  expiresAt: new Date(Date.now() + 3600000),
  lastActiveAt: new Date(),
  metadata: null,
  ...overrides
})

describe('server/utils/scoped-access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastInsertedValues = null
    selectResults = []
    updateRowsAffected = 1
    deleteRowsAffected = 0
    mockDb = createMockDb()
    vi.mocked(getCookie).mockReturnValue(null)
    vi.mocked(getHeader).mockReturnValue(null)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createScopedToken', () => {
    it('should create a token with default values', async () => {
      const result = await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper'
      })

      expect(result).toHaveProperty('token')
      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('expiresAt')
      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(0)
      expect(result.id).toBe('test-uuid-1234')
      expect(result.expiresAt).toBeInstanceOf(Date)

      // Verify database insert was called
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should use default role of guest', async () => {
      await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper'
      })

      expect(lastInsertedValues?.role).toBe('guest')
    })

    it('should use custom role when provided', async () => {
      await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper',
        role: 'helper'
      })

      expect(lastInsertedValues?.role).toBe('helper')
    })

    it('should set correct expiration time', async () => {
      const expiresIn = 2 * 60 * 60 * 1000 // 2 hours
      const before = Date.now()

      const result = await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper',
        expiresIn
      })

      const after = Date.now()
      const expectedMin = before + expiresIn
      const expectedMax = after + expiresIn

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
    })

    it('should default to 8 hours expiration', async () => {
      const before = Date.now()
      const eightHours = 8 * 60 * 60 * 1000

      const result = await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper'
      })

      const after = Date.now()
      const expectedMin = before + eightHours
      const expectedMax = after + eightHours

      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
    })

    it('should store metadata as JSON string', async () => {
      const metadata = { pin: '1234', permissions: ['read', 'write'] }

      await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper',
        metadata
      })

      expect(lastInsertedValues?.metadata).toBe(JSON.stringify(metadata))
    })

    it('should set isActive to true', async () => {
      await createScopedToken({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        displayName: 'Test Helper'
      })

      expect(lastInsertedValues?.isActive).toBe(true)
    })
  })

  describe('validateScopedToken', () => {
    it('should return null for non-existent token', async () => {
      selectResults = []

      const result = await validateScopedToken('non-existent-token')
      expect(result).toBeNull()
    })

    it('should return token data for valid token', async () => {
      selectResults = [createMockTokenRecord({ metadata: JSON.stringify({ pin: '1234' }) })]

      const result = await validateScopedToken('valid-token')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('token-id-1')
      expect(result?.organizationId).toBe('org-123')
      expect(result?.resourceType).toBe('event')
      expect(result?.resourceId).toBe('event-456')
      expect(result?.displayName).toBe('Test Helper')
      expect(result?.role).toBe('helper')
      expect(result?.metadata).toEqual({ pin: '1234' })
    })

    it('should update lastActiveAt on successful validation', async () => {
      selectResults = [createMockTokenRecord()]

      await validateScopedToken('valid-token')

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle null metadata', async () => {
      selectResults = [createMockTokenRecord({ metadata: null })]

      const result = await validateScopedToken('valid-token')
      expect(result?.metadata).toBeNull()
    })
  })

  describe('validateScopedTokenFromEvent', () => {
    it('should validate token from cookie', async () => {
      vi.mocked(getCookie).mockReturnValue('cookie-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()
      const result = await validateScopedTokenFromEvent(event)

      expect(result).not.toBeNull()
      expect(getCookie).toHaveBeenCalledWith(event, 'scoped-access-token')
    })

    it('should validate token from authorization header', async () => {
      vi.mocked(getCookie).mockReturnValue(null)
      vi.mocked(getHeader).mockReturnValue('Bearer header-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()
      const result = await validateScopedTokenFromEvent(event)

      expect(result).not.toBeNull()
      expect(getHeader).toHaveBeenCalledWith(event, 'authorization')
    })

    it('should prefer cookie over header', async () => {
      vi.mocked(getCookie).mockReturnValue('cookie-token')
      vi.mocked(getHeader).mockReturnValue('Bearer header-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()
      await validateScopedTokenFromEvent(event)

      // Cookie was found, so db query should have happened
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null when no token found', async () => {
      vi.mocked(getCookie).mockReturnValue(null)
      vi.mocked(getHeader).mockReturnValue(null)

      const event = createMockEvent()
      const result = await validateScopedTokenFromEvent(event)

      expect(result).toBeNull()
    })

    it('should use custom cookie name', async () => {
      vi.mocked(getCookie).mockReturnValue(null)

      const event = createMockEvent()
      await validateScopedTokenFromEvent(event, 'custom-token')

      expect(getCookie).toHaveBeenCalledWith(event, 'custom-token')
    })
  })

  describe('requireScopedAccess', () => {
    it('should return token data for valid access', async () => {
      vi.mocked(getCookie).mockReturnValue('valid-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()
      const result = await requireScopedAccess(event)

      expect(result).not.toBeNull()
      expect(result.id).toBe('token-id-1')
    })

    it('should throw 401 for invalid token', async () => {
      vi.mocked(getCookie).mockReturnValue('invalid-token')
      selectResults = []

      const event = createMockEvent()

      await expect(requireScopedAccess(event)).rejects.toThrow('Invalid or expired access token')
    })

    it('should throw 401 when no token present', async () => {
      vi.mocked(getCookie).mockReturnValue(null)
      vi.mocked(getHeader).mockReturnValue(null)

      const event = createMockEvent()

      await expect(requireScopedAccess(event)).rejects.toThrow('Invalid or expired access token')
    })
  })

  describe('requireScopedAccessToResource', () => {
    it('should return token data when resource matches', async () => {
      vi.mocked(getCookie).mockReturnValue('valid-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()
      const result = await requireScopedAccessToResource(event, 'event', 'event-456')

      expect(result).not.toBeNull()
      expect(result.resourceId).toBe('event-456')
    })

    it('should throw 403 when resource type does not match', async () => {
      vi.mocked(getCookie).mockReturnValue('valid-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()

      await expect(requireScopedAccessToResource(event, 'booking', 'event-456'))
        .rejects.toThrow('Access denied to this resource')
    })

    it('should throw 403 when resource ID does not match', async () => {
      vi.mocked(getCookie).mockReturnValue('valid-token')
      selectResults = [createMockTokenRecord()]

      const event = createMockEvent()

      await expect(requireScopedAccessToResource(event, 'event', 'event-999'))
        .rejects.toThrow('Access denied to this resource')
    })
  })

  describe('revokeScopedToken', () => {
    it('should revoke existing token', async () => {
      updateRowsAffected = 1

      const result = await revokeScopedToken('token-to-revoke')

      expect(result).toBe(true)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should return false for non-existent token', async () => {
      updateRowsAffected = 0

      const result = await revokeScopedToken('non-existent-token')

      expect(result).toBe(false)
    })
  })

  describe('revokeScopedTokensForResource', () => {
    it('should revoke all tokens for a resource', async () => {
      updateRowsAffected = 5

      const result = await revokeScopedTokensForResource('event', 'event-456')

      expect(result).toBe(5)
    })

    it('should return 0 when no tokens found', async () => {
      updateRowsAffected = 0

      const result = await revokeScopedTokensForResource('event', 'event-999')

      expect(result).toBe(0)
    })
  })

  describe('findExistingScopedToken', () => {
    it('should find existing token', async () => {
      selectResults = [createMockTokenRecord()]

      const result = await findExistingScopedToken('org-123', 'event', 'event-456', 'Test Helper')

      expect(result).not.toBeNull()
      expect(result?.displayName).toBe('Test Helper')
    })

    it('should return null when no token found', async () => {
      selectResults = []

      const result = await findExistingScopedToken('org-123', 'event', 'event-456', 'Unknown')

      expect(result).toBeNull()
    })

    it('should work without displayName filter', async () => {
      selectResults = [createMockTokenRecord({ displayName: 'Any Helper' })]

      const result = await findExistingScopedToken('org-123', 'event', 'event-456')

      expect(result).not.toBeNull()
    })
  })

  describe('listScopedTokensForResource', () => {
    it('should list all active tokens for a resource', async () => {
      // For this function, select returns directly without limit
      mockDb.select = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          { id: 'token-1', displayName: 'Helper 1', role: 'helper', expiresAt: new Date(), lastActiveAt: new Date() },
          { id: 'token-2', displayName: 'Helper 2', role: 'helper', expiresAt: new Date(), lastActiveAt: new Date() }
        ])
      }))

      const result = await listScopedTokensForResource('event', 'event-456')

      expect(result).toHaveLength(2)
      expect(result[0].displayName).toBe('Helper 1')
      expect(result[1].displayName).toBe('Helper 2')
    })

    it('should return empty array when no tokens', async () => {
      mockDb.select = vi.fn(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([])
      }))

      const result = await listScopedTokensForResource('event', 'event-999')

      expect(result).toHaveLength(0)
    })
  })

  describe('extendScopedToken', () => {
    it('should extend token expiration', async () => {
      const currentExpiry = new Date(Date.now() + 3600000)
      selectResults = [{ id: 'token-id-1', expiresAt: currentExpiry }]

      const additionalTime = 2 * 60 * 60 * 1000 // 2 hours
      const result = await extendScopedToken('token-to-extend', additionalTime)

      expect(result).not.toBeNull()
      expect(result!.getTime()).toBeGreaterThan(currentExpiry.getTime())
    })

    it('should return null for non-existent token', async () => {
      selectResults = []

      const result = await extendScopedToken('non-existent-token', 3600000)

      expect(result).toBeNull()
    })

    it('should use current time if token already expired', async () => {
      const expiredTime = new Date(Date.now() - 3600000) // 1 hour ago
      selectResults = [{ id: 'token-id-1', expiresAt: expiredTime }]

      const additionalTime = 60 * 60 * 1000 // 1 hour
      const before = Date.now()
      const result = await extendScopedToken('token', additionalTime)
      const after = Date.now()

      expect(result).not.toBeNull()
      // Should be based on current time, not expired time
      expect(result!.getTime()).toBeGreaterThanOrEqual(before + additionalTime)
      expect(result!.getTime()).toBeLessThanOrEqual(after + additionalTime)
    })
  })

  describe('cleanupExpiredScopedTokens', () => {
    it('should delete inactive tokens', async () => {
      let deleteCallCount = 0
      mockDb.delete = vi.fn(() => ({
        where: vi.fn().mockImplementation(async () => {
          deleteCallCount++
          return { rowsAffected: deleteCallCount === 1 ? 5 : 3 }
        })
      }))

      const result = await cleanupExpiredScopedTokens()

      expect(result).toBe(8)
      expect(mockDb.delete).toHaveBeenCalledTimes(2)
    })

    it('should return 0 when no tokens to clean', async () => {
      mockDb.delete = vi.fn(() => ({
        where: vi.fn().mockResolvedValue({ rowsAffected: 0 })
      }))

      const result = await cleanupExpiredScopedTokens()

      expect(result).toBe(0)
    })
  })
})
