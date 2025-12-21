export interface ChangelogPackage {
  name: string
  repo: string
  priority: 'critical' | 'high' | 'medium'
  enabled: boolean
}

export interface ChangelogRelease {
  id: string
  packageName: string
  packageRepo: string
  packagePriority: 'critical' | 'high' | 'medium'
  tagName: string
  name: string | null
  body: string | null
  htmlUrl: string
  publishedAt: string
  isPrerelease: boolean
  // AI-generated fields
  summary: string | null
  breakingChanges: string[]
  newFeatures: string[]
  importance: 'critical' | 'notable' | 'minor'
  relevanceScore: number
  processedAt: string | null
  model: string | null
}

export interface ChangelogData {
  lastSyncedAt: string | null
  releases: ChangelogRelease[]
}

export interface ChangelogPackagesConfig {
  packages: ChangelogPackage[]
}
