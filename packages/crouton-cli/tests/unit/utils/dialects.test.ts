import { describe, it, expect } from 'vitest'
import { DIALECTS } from '../../../lib/utils/dialects.ts'

describe('DIALECTS', () => {
  describe('pg', () => {
    const pg = DIALECTS.pg

    it('has correct importFrom path', () => {
      expect(pg.importFrom).toBe('drizzle-orm/pg-core')
    })

    it('has correct tableFn', () => {
      expect(pg.tableFn).toBe('pgTable')
    })

    it('has required imports', () => {
      expect(pg.imports).toContain('pgTable')
      expect(pg.imports).toContain('varchar')
      expect(pg.imports).toContain('text')
      expect(pg.imports).toContain('integer')
      expect(pg.imports).toContain('numeric')
      expect(pg.imports).toContain('boolean')
      expect(pg.imports).toContain('timestamp')
      expect(pg.imports).toContain('jsonb')
      expect(pg.imports).toContain('uuid')
    })

    describe('makeCol', () => {
      it('generates uuid primary key for string with primaryKey meta', () => {
        const result = pg.makeCol({ name: 'id', type: 'string', meta: { primaryKey: true } })
        expect(result).toBe("uuid('id').primaryKey().defaultRandom()")
      })

      it('generates varchar with maxLength when specified', () => {
        const result = pg.makeCol({ name: 'name', type: 'string', meta: { maxLength: 100 } })
        expect(result).toBe("varchar('name', { length: 100 })")
      })

      it('generates numeric with precision and scale for decimal', () => {
        const result = pg.makeCol({ name: 'price', type: 'decimal', meta: { precision: 10, scale: 2 } })
        expect(result).toBe("numeric('price', { precision: 10, scale: 2 })")
      })

      it('generates numeric with precision only for decimal', () => {
        const result = pg.makeCol({ name: 'amount', type: 'decimal', meta: { precision: 15 } })
        expect(result).toBe("numeric('amount', { precision: 15 })")
      })

      it('generates plain numeric for decimal without precision', () => {
        const result = pg.makeCol({ name: 'value', type: 'decimal' })
        expect(result).toBe("numeric('value')")
      })

      it('generates integer for number type', () => {
        const result = pg.makeCol({ name: 'count', type: 'number' })
        expect(result).toBe("integer('count')")
      })

      it('generates boolean for boolean type', () => {
        const result = pg.makeCol({ name: 'active', type: 'boolean' })
        expect(result).toBe("boolean('active')")
      })

      it('generates timestamp with timezone for date type', () => {
        const result = pg.makeCol({ name: 'createdAt', type: 'date' })
        expect(result).toBe("timestamp('createdAt', { withTimezone: true })")
      })

      it('generates jsonb for json type', () => {
        const result = pg.makeCol({ name: 'data', type: 'json' })
        expect(result).toBe("jsonb('data')")
      })

      it('generates text for text type', () => {
        const result = pg.makeCol({ name: 'content', type: 'text' })
        expect(result).toBe("text('content')")
      })

      it('defaults to varchar(255) for plain string type', () => {
        const result = pg.makeCol({ name: 'title', type: 'string' })
        expect(result).toBe("varchar('title', { length: 255 })")
      })

      it('handles missing meta gracefully', () => {
        const result = pg.makeCol({ name: 'field', type: 'string' })
        expect(result).toBe("varchar('field', { length: 255 })")
      })
    })
  })

  describe('sqlite', () => {
    const sqlite = DIALECTS.sqlite

    it('has correct importFrom path', () => {
      expect(sqlite.importFrom).toBe('drizzle-orm/sqlite-core')
    })

    it('has correct tableFn', () => {
      expect(sqlite.tableFn).toBe('sqliteTable')
    })

    it('has required imports', () => {
      expect(sqlite.imports).toContain('sqliteTable')
      expect(sqlite.imports).toContain('text')
      expect(sqlite.imports).toContain('integer')
      expect(sqlite.imports).toContain('real')
    })

    describe('makeCol', () => {
      it('generates text primary key for string with primaryKey meta', () => {
        const result = sqlite.makeCol({ name: 'id', type: 'string', meta: { primaryKey: true } })
        expect(result).toBe("text('id').primaryKey()")
      })

      it('generates real for decimal type', () => {
        const result = sqlite.makeCol({ name: 'price', type: 'decimal' })
        expect(result).toBe("real('price')")
      })

      it('generates integer for number type', () => {
        const result = sqlite.makeCol({ name: 'count', type: 'number' })
        expect(result).toBe("integer('count')")
      })

      it('generates integer with boolean mode for boolean type', () => {
        const result = sqlite.makeCol({ name: 'active', type: 'boolean' })
        expect(result).toBe("integer('active', { mode: 'boolean' })")
      })

      it('generates integer with timestamp mode for date type', () => {
        const result = sqlite.makeCol({ name: 'createdAt', type: 'date' })
        expect(result).toBe("integer('createdAt', { mode: 'timestamp' })")
      })

      it('generates text with json mode for json type', () => {
        const result = sqlite.makeCol({ name: 'data', type: 'json' })
        expect(result).toBe("text('data', { mode: 'json' })")
      })

      it('defaults to text for plain string type', () => {
        const result = sqlite.makeCol({ name: 'title', type: 'string' })
        expect(result).toBe("text('title')")
      })

      it('defaults to text for text type', () => {
        const result = sqlite.makeCol({ name: 'content', type: 'text' })
        expect(result).toBe("text('content')")
      })

      it('handles missing meta gracefully', () => {
        const result = sqlite.makeCol({ name: 'field', type: 'string' })
        expect(result).toBe("text('field')")
      })
    })
  })
})
