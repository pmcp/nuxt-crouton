import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

let sqliteDb: ReturnType<typeof drizzleSqlite> | null = null

export function useLocalDB() {
  if (!sqliteDb) {
    const sqlite = new Database('.data/db.sqlite')
    sqliteDb = drizzleSqlite(sqlite)
    console.log('[db] Using local SQLite: .data/db.sqlite')
  }
  return sqliteDb
}
