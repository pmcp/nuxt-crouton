/**
 * Server-side Scoped Access Grant Tests
 *
 * Tests the grant (credential) half of scoped access:
 * - Grant creation and update (upsert)
 * - Credential verification and token redemption
 * - Brute-force lockout
 * - Usage limits
 * - Grant revocation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Track values for assertions
let lastInsertedValues: Record<string, unknown> | null = null
let lastUpdateValues: Record<string, unknown> | null = null
let selectResults: unknown[] = []
let updateRowsAffected = 1

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
    set: vi.fn(function (this: unknown, data: Record<string, unknown>) {
      lastUpdateValues = data
      return this
    }),
    where: vi.fn(async () => ({ rowsAffected: updateRowsAffected }))
  })),
  delete: vi.fn(() => ({
    where: vi.fn(async () => ({ rowsAffected: 0 }))
  }))
})

let mockDb = createMockDb()

// Setup global mocks — keep the real SubtleCrypto for secret hashing
const realSubtle = globalThis.crypto.subtle

vi.stubGlobal('useDB', () => mockDb)

vi.stubGlobal('crypto', {
  randomUUID: vi.fn().mockReturnValue('test-uuid-1234'),
  getRandomValues: vi.fn((arr: Uint8Array) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256)
    }
    return arr
  }),
  subtle: realSubtle
})

// Import after mocks
import {
  upsertScopedGrant,
  verifyAndRedeemGrant,
  revokeScopedGrantsForResource
} from '../../../server/utils/scoped-access'

/**
 * Create a grant via upsertScopedGrant to capture a real secretHash, then
 * return a select-able grant record for that secret.
 */
async function createMockGrantRecord(secret: string, overrides: Record<string, unknown> = {}) {
  selectResults = [] // force insert path
  await upsertScopedGrant({
    organizationId: 'org-123',
    resourceType: 'event',
    resourceId: 'event-456',
    secret,
    role: 'helper'
  })
  const secretHash = lastInsertedValues?.secretHash as string

  return {
    id: 'grant-id-1',
    organizationId: 'org-123',
    resourceType: 'event',
    resourceId: 'event-456',
    role: 'helper',
    credentialType: 'pin',
    secretHash,
    maxUses: null,
    usedCount: 0,
    failedAttempts: 0,
    lockedUntil: null,
    isActive: true,
    expiresAt: null,
    tokenTtl: 8 * 60 * 60 * 1000,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

describe('server/utils/scoped-access grants', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastInsertedValues = null
    lastUpdateValues = null
    selectResults = []
    updateRowsAffected = 1
    mockDb = createMockDb()
  })

  // No vi.resetAllMocks() here — it would strip the getRandomValues
  // implementation the secret hashing depends on after the first test.

  describe('upsertScopedGrant', () => {
    it('should create a new grant with hashed secret', async () => {
      selectResults = []

      const result = await upsertScopedGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234'
      })

      expect(result.id).toBe('test-uuid-1234')
      expect(mockDb.insert).toHaveBeenCalled()
      // Never store the plaintext; format is `{salt}:{hash}`
      const stored = lastInsertedValues?.secretHash as string
      expect(stored).not.toContain('1234:')
      expect(stored).toMatch(/^[0-9a-f]{32}:[0-9a-f]{64}$/)
    })

    it('should default role to guest and credentialType to pin', async () => {
      selectResults = []

      await upsertScopedGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234'
      })

      expect(lastInsertedValues?.role).toBe('guest')
      expect(lastInsertedValues?.credentialType).toBe('pin')
    })

    it('should update existing grant and reset counters', async () => {
      selectResults = [{ id: 'existing-grant-id' }]

      const result = await upsertScopedGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '5678',
        role: 'helper'
      })

      expect(result.id).toBe('existing-grant-id')
      expect(mockDb.insert).not.toHaveBeenCalled()
      expect(mockDb.update).toHaveBeenCalled()
      expect(lastUpdateValues?.usedCount).toBe(0)
      expect(lastUpdateValues?.failedAttempts).toBe(0)
      expect(lastUpdateValues?.lockedUntil).toBeNull()
      expect(lastUpdateValues?.isActive).toBe(true)
    })
  })

  describe('verifyAndRedeemGrant', () => {
    it('should return not_found when no grant exists', async () => {
      selectResults = []

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('should return not_found for an expired grant', async () => {
      const grant = await createMockGrantRecord('1234', {
        expiresAt: new Date(Date.now() - 1000)
      })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result).toEqual({ ok: false, reason: 'not_found' })
    })

    it('should mint a token on correct secret', async () => {
      const grant = await createMockGrantRecord('1234')
      selectResults = [grant]
      lastInsertedValues = null

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.token).toBeDefined()
        expect(result.role).toBe('helper')
        expect(result.displayName).toBe('John Helper')
        expect(result.expiresAt).toBeInstanceOf(Date)
      }
      // Token insert carries the grant's role
      expect(lastInsertedValues?.role).toBe('helper')
      expect(lastInsertedValues?.displayName).toBe('John Helper')
    })

    it('should return invalid_secret and record the failure', async () => {
      const grant = await createMockGrantRecord('1234')
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '9999',
        displayName: 'John Helper'
      })

      expect(result).toEqual({ ok: false, reason: 'invalid_secret' })
      expect(mockDb.update).toHaveBeenCalled()
      expect(lastUpdateValues?.failedAttempts).toBe(1)
      expect(lastUpdateValues?.lockedUntil).toBeNull()
    })

    it('should lock the grant after repeated failures', async () => {
      const grant = await createMockGrantRecord('1234', { failedAttempts: 4 })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '9999',
        displayName: 'John Helper'
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('locked')
        expect(result.retryAfterMs).toBeGreaterThan(0)
      }
      expect(lastUpdateValues?.failedAttempts).toBe(5)
      expect(lastUpdateValues?.lockedUntil).toBeInstanceOf(Date)
    })

    it('should refuse redemption while locked, even with correct secret', async () => {
      const grant = await createMockGrantRecord('1234', {
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() + 60000)
      })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.reason).toBe('locked')
        expect(result.retryAfterMs).toBeGreaterThan(0)
        expect(result.retryAfterMs).toBeLessThanOrEqual(60000)
      }
    })

    it('should allow redemption after lockout expires', async () => {
      const grant = await createMockGrantRecord('1234', {
        failedAttempts: 5,
        lockedUntil: new Date(Date.now() - 1000)
      })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result.ok).toBe(true)
    })

    it('should return exhausted when maxUses is reached', async () => {
      const grant = await createMockGrantRecord('1234', { maxUses: 1, usedCount: 1 })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result).toEqual({ ok: false, reason: 'exhausted' })
    })

    it('should redeem when under maxUses', async () => {
      const grant = await createMockGrantRecord('1234', { maxUses: 5, usedCount: 4 })
      selectResults = [grant]

      const result = await verifyAndRedeemGrant({
        organizationId: 'org-123',
        resourceType: 'event',
        resourceId: 'event-456',
        secret: '1234',
        displayName: 'John Helper'
      })

      expect(result.ok).toBe(true)
    })
  })

  describe('revokeScopedGrantsForResource', () => {
    it('should revoke all grants for a resource', async () => {
      updateRowsAffected = 2

      const result = await revokeScopedGrantsForResource('event', 'event-456')

      expect(result).toBe(2)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should return 0 when no grants found', async () => {
      updateRowsAffected = 0

      const result = await revokeScopedGrantsForResource('event', 'event-999')

      expect(result).toBe(0)
    })
  })
})
