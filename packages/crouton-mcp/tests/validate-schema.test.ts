import { describe, it, expect } from 'vitest'
import { handleValidateSchema, type SchemaField } from '../src/tools/validate-schema.js'

describe('handleValidateSchema', () => {
  describe('empty schema validation', () => {
    it('should reject an empty schema', () => {
      const result = handleValidateSchema({ schema: {} })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Schema is empty. At least one field is required.')
    })

    it('should reject null schema', () => {
      const result = handleValidateSchema({ schema: null as unknown as Record<string, SchemaField> })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Schema is empty. At least one field is required.')
    })
  })

  describe('field type validation', () => {
    it('should accept valid field types', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string' },
          description: { type: 'text' },
          count: { type: 'number' },
          price: { type: 'decimal' },
          active: { type: 'boolean' },
          createdDate: { type: 'date' },
          metadata: { type: 'json' },
          items: { type: 'repeater' },
          tags: { type: 'array' }
        }
      })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid field types', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'invalid-type' }
        }
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('invalid type "invalid-type"')
    })

    it('should reject fields without type property', () => {
      const result = handleValidateSchema({
        schema: {
          name: {} as SchemaField
        }
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('missing the "type" property')
    })
  })

  describe('id field validation', () => {
    it('should warn if id field lacks primaryKey meta', () => {
      const result = handleValidateSchema({
        schema: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      })

      expect(result.valid).toBe(true)
      expect(result.warnings).toContain('The "id" field should have meta.primaryKey: true')
    })

    it('should not warn if id has primaryKey', () => {
      const result = handleValidateSchema({
        schema: {
          id: { type: 'string', meta: { primaryKey: true } },
          name: { type: 'string' }
        }
      })

      expect(result.warnings.some(w => w.includes('primaryKey'))).toBe(false)
    })
  })

  describe('auto-generated field handling', () => {
    it('should silently skip auto-generated fields', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string' },
          teamId: { type: 'string' },
          createdAt: { type: 'date' }
        }
      })

      expect(result.valid).toBe(true)
      // Auto-generated fields should be silently skipped, not warned about
      expect(result.warnings.some(w => w.includes('teamId'))).toBe(false)
      expect(result.warnings.some(w => w.includes('createdAt'))).toBe(false)
    })

    it('should warn about hierarchy fields when hierarchy option enabled', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string' },
          parentId: { type: 'string' }
        },
        options: { hierarchy: true }
      })

      expect(result.valid).toBe(true)
      expect(result.warnings.some(w => w.includes('parentId') && w.includes('--hierarchy'))).toBe(true)
    })
  })

  describe('decimal field validation', () => {
    it('should warn if decimal field lacks precision', () => {
      const result = handleValidateSchema({
        schema: {
          price: { type: 'decimal' }
        }
      })

      expect(result.warnings.some(w => w.includes('precision'))).toBe(true)
    })

    it('should warn if decimal field lacks scale', () => {
      const result = handleValidateSchema({
        schema: {
          price: { type: 'decimal', meta: { precision: 10 } }
        }
      })

      expect(result.warnings.some(w => w.includes('scale'))).toBe(true)
    })

    it('should not warn if decimal has both precision and scale', () => {
      const result = handleValidateSchema({
        schema: {
          price: { type: 'decimal', meta: { precision: 10, scale: 2 } }
        }
      })

      const decimalWarnings = result.warnings.filter(w =>
        w.includes('decimal') && (w.includes('precision') || w.includes('scale'))
      )
      expect(decimalWarnings).toHaveLength(0)
    })
  })

  describe('string field validation', () => {
    it('should warn if string field lacks maxLength', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string' }
        }
      })

      expect(result.warnings.some(w => w.includes('maxLength'))).toBe(true)
    })

    it('should not warn if string has maxLength', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string', meta: { maxLength: 255 } }
        }
      })

      const maxLengthWarnings = result.warnings.filter(w => w.includes('maxLength'))
      expect(maxLengthWarnings).toHaveLength(0)
    })
  })

  describe('refTarget validation', () => {
    it('should accept valid refTarget', () => {
      const result = handleValidateSchema({
        schema: {
          categoryId: { type: 'string', refTarget: 'categories' }
        }
      })

      expect(result.valid).toBe(true)
    })

    it('should reject non-string refTarget', () => {
      const result = handleValidateSchema({
        schema: {
          categoryId: { type: 'string', refTarget: 123 as unknown as string }
        }
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('refTarget')
    })

    it('should warn if refTarget field is not string type', () => {
      const result = handleValidateSchema({
        schema: {
          categoryId: { type: 'number', refTarget: 'categories' }
        }
      })

      expect(result.warnings.some(w => w.includes('refTarget') && w.includes('string'))).toBe(true)
    })
  })

  describe('meta validation', () => {
    it('should reject non-object meta', () => {
      const result = handleValidateSchema({
        schema: {
          name: { type: 'string', meta: 'invalid' as unknown as SchemaField['meta'] }
        }
      })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('invalid meta')
    })
  })

  describe('meaningful fields check', () => {
    it('should warn if schema only has id field', () => {
      const result = handleValidateSchema({
        schema: {
          id: { type: 'string', meta: { primaryKey: true } }
        }
      })

      expect(result.warnings.some(w => w.includes('only contains auto-generated fields'))).toBe(true)
    })
  })
})
