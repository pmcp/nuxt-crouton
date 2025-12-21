import { describe, it, expect } from 'vitest'
import { usersConfig, useUsers } from '../useUsers'

describe('useUsers', () => {
  describe('usersConfig', () => {
    it('has correct collection name', () => {
      expect(usersConfig.name).toBe('users')
    })

    it('has a valid zod schema', () => {
      expect(usersConfig.schema).toBeDefined()
      // Verify schema parses valid user objects
      const validUser = {
        id: 'user-123',
        title: 'John Doe',
        email: 'john@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'admin'
      }
      const result = usersConfig.schema.safeParse(validUser)
      expect(result.success).toBe(true)
    })

    it('schema requires id and title', () => {
      const invalidUser = {
        email: 'test@example.com'
      }
      const result = usersConfig.schema.safeParse(invalidUser)
      expect(result.success).toBe(false)
    })

    it('schema accepts minimal required fields', () => {
      const minimalUser = {
        id: 'user-123',
        title: 'John'
      }
      const result = usersConfig.schema.safeParse(minimalUser)
      expect(result.success).toBe(true)
    })

    it('schema makes email, avatarUrl, and role optional', () => {
      const userWithoutOptionals = {
        id: 'user-123',
        title: 'John Doe'
      }
      const result = usersConfig.schema.safeParse(userWithoutOptionals)
      expect(result.success).toBe(true)
    })

    it('has correct meta information', () => {
      expect(usersConfig.meta).toBeDefined()
      expect(usersConfig.meta.label).toBe('Users')
      expect(usersConfig.meta.description).toBe('External user collection from auth system')
    })
  })

  describe('useUsers()', () => {
    it('returns the usersConfig object', () => {
      const result = useUsers()
      expect(result).toBe(usersConfig)
    })

    it('returns config with expected properties', () => {
      const config = useUsers()
      expect(config.name).toBe('users')
      expect(config.schema).toBeDefined()
      expect(config.meta).toBeDefined()
    })
  })

  describe('schema validation edge cases', () => {
    it('rejects non-string id', () => {
      const invalidUser = {
        id: 123, // should be string
        title: 'John'
      }
      const result = usersConfig.schema.safeParse(invalidUser)
      expect(result.success).toBe(false)
    })

    it('rejects non-string title', () => {
      const invalidUser = {
        id: 'user-123',
        title: { name: 'John' } // should be string
      }
      const result = usersConfig.schema.safeParse(invalidUser)
      expect(result.success).toBe(false)
    })

    it('accepts empty string for optional fields', () => {
      const userWithEmptyStrings = {
        id: 'user-123',
        title: 'John',
        email: '',
        avatarUrl: '',
        role: ''
      }
      const result = usersConfig.schema.safeParse(userWithEmptyStrings)
      expect(result.success).toBe(true)
    })

    it('validates full user object structure', () => {
      const fullUser = {
        id: 'user-abc-123',
        title: 'Jane Smith',
        email: 'jane.smith@company.org',
        avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        role: 'member'
      }
      const result = usersConfig.schema.parse(fullUser)
      expect(result).toEqual(fullUser)
    })
  })
})
