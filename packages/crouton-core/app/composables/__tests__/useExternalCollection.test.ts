import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { defineExternalCollection } from '../useExternalCollection'

describe('defineExternalCollection', () => {
  const testSchema = z.object({
    id: z.string(),
    title: z.string(),
    email: z.string().optional()
  })

  describe('basic configuration', () => {
    it('returns config object with required properties', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.name).toBe('users')
      expect(config.layer).toBe('external')
    })

    it('sets apiPath to name by default', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.apiPath).toBe('users')
    })

    it('uses custom apiPath when provided', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        apiPath: '/custom/users-api'
      })

      expect(config.apiPath).toBe('/custom/users-api')
    })

    it('sets fetchStrategy to query by default', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.fetchStrategy).toBe('query')
    })

    it('uses custom fetchStrategy when provided', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        fetchStrategy: 'restful'
      })

      expect(config.fetchStrategy).toBe('restful')
    })
  })

  describe('readonly setting', () => {
    it('sets readonly to true by default', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.readonly).toBe(true)
    })

    it('respects readonly: false', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        readonly: false
      })

      expect(config.readonly).toBe(false)
    })

    it('respects readonly: true explicitly', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        readonly: true
      })

      expect(config.readonly).toBe(true)
    })
  })

  describe('default values', () => {
    it('sets componentName to null', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.componentName).toBeNull()
    })

    it('sets defaultValues to empty object', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.defaultValues).toEqual({})
    })

    it('sets columns to empty array', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.columns).toEqual([])
    })
  })

  describe('meta configuration', () => {
    it('sets meta to empty object by default', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.meta).toEqual({})
    })

    it('uses custom meta when provided', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        meta: {
          label: 'Team Users',
          description: 'Users from the auth system'
        }
      })

      expect(config.meta.label).toBe('Team Users')
      expect(config.meta.description).toBe('Users from the auth system')
    })

    it('handles partial meta', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        meta: {
          label: 'Users Only'
        }
      })

      expect(config.meta.label).toBe('Users Only')
      expect(config.meta.description).toBeUndefined()
    })
  })

  describe('proxy configuration', () => {
    it('sets proxy to undefined by default', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      expect(config.proxy).toBeUndefined()
    })

    it('uses proxy configuration when provided', () => {
      const transform = (item: any) => ({
        id: item.userId,
        title: item.fullName
      })

      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        proxy: {
          enabled: true,
          sourceEndpoint: 'https://api.example.com/users',
          transform
        }
      })

      expect(config.proxy).toBeDefined()
      expect(config.proxy!.enabled).toBe(true)
      expect(config.proxy!.sourceEndpoint).toBe('https://api.example.com/users')
      expect(config.proxy!.transform).toBe(transform)
    })

    it('proxy transform function works correctly', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        proxy: {
          enabled: true,
          sourceEndpoint: 'https://api.example.com/users',
          transform: (item: any) => ({
            id: item.userId,
            title: `${item.firstName} ${item.lastName}`
          })
        }
      })

      const rawItem = { userId: '123', firstName: 'John', lastName: 'Doe' }
      const transformed = config.proxy!.transform(rawItem)

      expect(transformed.id).toBe('123')
      expect(transformed.title).toBe('John Doe')
    })
  })

  describe('schema handling', () => {
    it('attaches schema as non-enumerable property', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      // Schema should exist
      expect(config.schema).toBe(testSchema)

      // But should not be enumerable (won't appear in Object.keys)
      const keys = Object.keys(config)
      expect(keys).not.toContain('schema')
    })

    it('schema is accessible directly', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      // Can use schema for validation
      const result = config.schema.safeParse({
        id: '1',
        title: 'John'
      })

      expect(result.success).toBe(true)
    })

    it('schema validates correctly', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      // Valid data
      const validResult = config.schema.safeParse({
        id: '123',
        title: 'John Doe',
        email: 'john@example.com'
      })
      expect(validResult.success).toBe(true)

      // Invalid data (missing required field)
      const invalidResult = config.schema.safeParse({
        id: '123'
        // missing title
      })
      expect(invalidResult.success).toBe(false)
    })
  })

  describe('full configuration', () => {
    it('handles all options together', () => {
      const transform = (item: any) => ({ id: item.id, title: item.name })

      const config = defineExternalCollection({
        name: 'externalUsers',
        schema: testSchema,
        apiPath: '/api/v2/users',
        fetchStrategy: 'restful',
        readonly: false,
        meta: {
          label: 'External Users',
          description: 'Users from external system'
        },
        proxy: {
          enabled: true,
          sourceEndpoint: 'https://external-api.com/users',
          transform
        }
      })

      expect(config.name).toBe('externalUsers')
      expect(config.layer).toBe('external')
      expect(config.apiPath).toBe('/api/v2/users')
      expect(config.fetchStrategy).toBe('restful')
      expect(config.readonly).toBe(false)
      expect(config.meta.label).toBe('External Users')
      expect(config.proxy!.enabled).toBe(true)
      expect(config.schema).toBe(testSchema)
    })
  })

  describe('type safety', () => {
    it('returns correct type with schema', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      // TypeScript would catch if schema type was wrong
      type InferredSchema = typeof config.schema
      type Expected = typeof testSchema

      // This is a compile-time check
      const _typeCheck: InferredSchema extends Expected ? true : false = true
      expect(_typeCheck).toBe(true)
    })
  })

  describe('SSR serialization safety', () => {
    it('config can be serialized without schema (for SSR)', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema
      })

      // When JSON.stringify is used (e.g., during SSR), schema should be excluded
      const serialized = JSON.stringify(config)
      const parsed = JSON.parse(serialized)

      expect(parsed.name).toBe('users')
      expect(parsed.layer).toBe('external')
      expect(parsed.schema).toBeUndefined() // Schema excluded from serialization
    })

    it('enumerable properties are all serializable', () => {
      const config = defineExternalCollection({
        name: 'users',
        schema: testSchema,
        meta: { label: 'Users' }
      })

      // Get all enumerable keys
      const keys = Object.keys(config)

      // All should be primitive or plain objects (serializable)
      for (const key of keys) {
        const value = (config as any)[key]
        expect(() => JSON.stringify(value)).not.toThrow()
      }
    })
  })
})
