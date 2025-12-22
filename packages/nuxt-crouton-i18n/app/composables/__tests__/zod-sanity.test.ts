import { z } from 'zod'
import { describe, it, expect } from 'vitest'

/**
 * Zod v4 + Vitest Compatibility Tests
 *
 * FINDING: Only z.record() breaks in Vitest + Zod v4
 * Error: "Cannot read properties of undefined (reading '_zod')"
 *
 * This is a specific bug in z.record() implementation, not a general
 * issue with nested schema references.
 */
describe('zod v4 + vitest compatibility', () => {
  describe('patterns that WORK', () => {
    it('z.string()', () => {
      const schema = z.string()
      expect(schema.safeParse('test').success).toBe(true)
    })

    it('z.object({ x: z.string() })', () => {
      const schema = z.object({ name: z.string() })
      expect(schema.safeParse({ name: 'test' }).success).toBe(true)
    })

    it('z.string().refine()', () => {
      const schema = z.string().refine(val => val.length > 0)
      expect(schema.safeParse('test').success).toBe(true)
    })

    it('z.array(z.string())', () => {
      const schema = z.object({ items: z.array(z.string()) })
      expect(schema.safeParse({ items: ['a', 'b'] }).success).toBe(true)
    })

    it('z.map(z.string(), z.number())', () => {
      const schema = z.map(z.string(), z.number())
      expect(schema.safeParse(new Map([['a', 1]])).success).toBe(true)
    })

    it('z.set(z.string())', () => {
      const schema = z.set(z.string())
      expect(schema.safeParse(new Set(['a', 'b'])).success).toBe(true)
    })

    it('z.tuple([z.string(), z.number()])', () => {
      const schema = z.tuple([z.string(), z.number()])
      expect(schema.safeParse(['hello', 42]).success).toBe(true)
    })

    it('z.union([z.string(), z.number()])', () => {
      const schema = z.union([z.string(), z.number()])
      expect(schema.safeParse('test').success).toBe(true)
    })
  })

  describe('z.record() bug and fixes', () => {
    /**
     * BUG: z.record(valueSchema) breaks in Vitest + Zod v4
     * FIX: Use z.record(keySchema, valueSchema) with explicit key schema
     *
     * BROKEN:  z.record(z.string())
     * WORKING: z.record(z.string(), z.string())
     */
    it.skip('BROKEN: z.record(z.string()) - implicit key', () => {
      const schema = z.object({ values: z.record(z.string()) })
      expect(schema.safeParse({ values: { en: 'Hello' } }).success).toBe(true)
    })

    it('FIX: z.record(z.string(), z.string()) - explicit key', () => {
      const schema = z.object({ values: z.record(z.string(), z.string()) })
      expect(schema.safeParse({ values: { en: 'Hello' } }).success).toBe(true)
    })

    // Alternative fixes that also work:
    it('ALT FIX: z.object({}).catchall(z.string())', () => {
      const schema = z.object({ values: z.object({}).catchall(z.string()) })
      expect(schema.safeParse({ values: { en: 'Hello' } }).success).toBe(true)
    })
  })
})
