// Database dialect configurations

export const DIALECTS = {
  pg: {
    importFrom: 'drizzle-orm/pg-core',
    tableFn: 'pgTable',
    imports: ['pgTable', 'varchar', 'text', 'integer', 'numeric', 'boolean', 'timestamp', 'jsonb', 'uuid'],
    makeCol(f) {
      const m = f.meta || {}
      
      // Handle primary key
      if (m.primaryKey && f.type === 'string') {
        return `uuid('${f.name}').primaryKey().defaultRandom()`
      }
      
      // Handle different types
      if (f.type === 'string' && m.maxLength) {
        return `varchar('${f.name}', { length: ${m.maxLength} })`
      }
      if (f.type === 'decimal' && (m.precision || m.scale)) {
        const args = ['precision: ' + (m.precision || 10)]
        if (m.scale != null) args.push('scale: ' + m.scale)
        return `numeric('${f.name}', { ${args.join(', ')} })`
      }
      if (f.type === 'decimal') return `numeric('${f.name}')`
      if (f.type === 'number') return `integer('${f.name}')`
      if (f.type === 'boolean') return `boolean('${f.name}')`
      if (f.type === 'date') return `timestamp('${f.name}', { withTimezone: true })`
      if (f.type === 'json') return `jsonb('${f.name}')`
      if (f.type === 'text') return `text('${f.name}')`
      return `varchar('${f.name}', { length: 255 })`
    }
  },
  sqlite: {
    importFrom: 'drizzle-orm/sqlite-core',
    tableFn: 'sqliteTable',
    imports: ['sqliteTable', 'text', 'integer', 'real'],
    makeCol(f) {
      const m = f.meta || {}
      
      // Handle primary key
      if (m.primaryKey && f.type === 'string') {
        return `text('${f.name}').primaryKey()`
      }
      
      // Handle different types
      if (f.type === 'decimal') return `real('${f.name}')`
      if (f.type === 'number') return `integer('${f.name}')`
      if (f.type === 'boolean') return `integer('${f.name}', { mode: 'boolean' })`
      if (f.type === 'date') return `integer('${f.name}', { mode: 'timestamp' })`
      if (f.type === 'json') return `text('${f.name}', { mode: 'json' })`
      return `text('${f.name}')`
    }
  }
}