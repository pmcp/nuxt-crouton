import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ChangelogData, ChangelogRelease } from '~~/shared/types/changelog'

export default defineEventHandler((event) => {
  const query = getQuery(event)

  // Parse query params
  const packages = query.packages ? String(query.packages).split(',') : null
  const importance = query.importance as string | null
  const priority = query.priority as string | null
  const limit = Math.min(Number(query.limit) || 20, 100)
  const offset = Number(query.offset) || 0

  // Load data from JSON file
  const dataPath = resolve(process.cwd(), 'data/changelog-releases.json')
  let data: ChangelogData

  try {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'))
  }
  catch {
    return {
      releases: [],
      total: 0,
      lastSyncedAt: null,
      pagination: { limit, offset }
    }
  }

  // Filter releases
  let releases = data.releases

  if (packages && packages.length > 0) {
    releases = releases.filter((r: ChangelogRelease) => packages.includes(r.packageName))
  }

  if (importance) {
    releases = releases.filter((r: ChangelogRelease) => r.importance === importance)
  }

  if (priority) {
    releases = releases.filter((r: ChangelogRelease) => r.packagePriority === priority)
  }

  // Get total before pagination
  const total = releases.length

  // Apply pagination
  releases = releases.slice(offset, offset + limit)

  return {
    releases,
    total,
    lastSyncedAt: data.lastSyncedAt,
    pagination: { limit, offset }
  }
})
