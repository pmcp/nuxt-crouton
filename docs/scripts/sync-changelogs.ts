#!/usr/bin/env npx tsx
/**
 * Changelog Sync Script
 *
 * Fetches GitHub releases for tracked packages, generates AI summaries,
 * and updates the changelog data file.
 *
 * Usage:
 *   npx tsx scripts/sync-changelogs.ts
 *
 * Environment variables:
 *   GITHUB_TOKEN - GitHub PAT for API access (optional but recommended)
 *   ANTHROPIC_API_KEY - Anthropic API key for AI summaries
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Types
interface ChangelogPackage {
  name: string
  repo: string
  priority: 'critical' | 'high' | 'medium'
  enabled: boolean
}

interface ChangelogRelease {
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
  summary: string | null
  breakingChanges: string[]
  newFeatures: string[]
  importance: 'critical' | 'notable' | 'minor'
  relevanceScore: number
  processedAt: string | null
  model: string | null
}

interface ChangelogData {
  lastSyncedAt: string | null
  releases: ChangelogRelease[]
}

interface GitHubRelease {
  id: number
  tag_name: string
  name: string | null
  body: string | null
  html_url: string
  published_at: string
  prerelease: boolean
}

interface AISummary {
  summary: string
  breakingChanges: string[]
  newFeatures: string[]
  importance: 'critical' | 'notable' | 'minor'
  relevanceScore: number
}

// Config
const DATA_DIR = resolve(__dirname, '../data')
const PACKAGES_FILE = resolve(DATA_DIR, 'changelog-packages.json')
const RELEASES_FILE = resolve(DATA_DIR, 'changelog-releases.json')
const MAX_RELEASES_PER_PACKAGE = 5
const MAX_RELEASES_TO_KEEP = 100

// Load data files
function loadPackages(): ChangelogPackage[] {
  const data = JSON.parse(readFileSync(PACKAGES_FILE, 'utf-8'))
  return data.packages.filter((pkg: ChangelogPackage) => pkg.enabled)
}

function loadReleases(): ChangelogData {
  return JSON.parse(readFileSync(RELEASES_FILE, 'utf-8'))
}

function saveReleases(data: ChangelogData): void {
  writeFileSync(RELEASES_FILE, JSON.stringify(data, null, 2))
}

// GitHub API
async function fetchGitHubReleases(repo: string): Promise<GitHubRelease[]> {
  const token = process.env.GITHUB_TOKEN
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/releases?per_page=${MAX_RELEASES_PER_PACKAGE}`,
    { headers }
  )

  if (!response.ok) {
    if (response.status === 403) {
      console.warn(`Rate limited for ${repo}, skipping...`)
      return []
    }
    throw new Error(`GitHub API error for ${repo}: ${response.status}`)
  }

  return response.json()
}

// AI Summary
const SUMMARY_PROMPT = `You are analyzing a software release changelog for developers using Nuxt/Vue.

Analyze this release and provide a JSON response with:
1. "summary": A 2-3 sentence summary focusing on what matters to Nuxt/Vue developers
2. "breakingChanges": Array of breaking changes (empty array if none, max 5 items)
3. "newFeatures": Array of notable new features (empty array if none, max 5 items)
4. "importance": Rate as "critical" (breaking changes or major features), "notable" (useful features), or "minor" (bug fixes only)
5. "relevanceScore": 0-100 rating of how relevant this is to Nuxt/Vue development

Respond with ONLY valid JSON, no markdown or explanation.

Package: {packageName}
Version: {tagName}
Release notes:
{body}`

async function generateAISummary(
  packageName: string,
  tagName: string,
  body: string | null
): Promise<AISummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY

  // Return default if no API key or empty body
  if (!apiKey || !body || body.trim().length < 50) {
    return {
      summary: body ? 'See full release notes for details.' : 'No release notes provided.',
      breakingChanges: [],
      newFeatures: [],
      importance: 'minor',
      relevanceScore: 50
    }
  }

  const prompt = SUMMARY_PROMPT
    .replace('{packageName}', packageName)
    .replace('{tagName}', tagName)
    .replace('{body}', body.slice(0, 8000))

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })
    })

    if (!response.ok) {
      console.warn(`AI API error: ${response.status}`)
      return {
        summary: 'AI summary unavailable. See full release notes.',
        breakingChanges: [],
        newFeatures: [],
        importance: 'minor',
        relevanceScore: 50
      }
    }

    const result = await response.json()
    const text = result.content[0]?.text || '{}'

    // Parse JSON from response
    const parsed = JSON.parse(text)
    return {
      summary: parsed.summary || 'See full release notes.',
      breakingChanges: parsed.breakingChanges || [],
      newFeatures: parsed.newFeatures || [],
      importance: parsed.importance || 'minor',
      relevanceScore: parsed.relevanceScore || 50
    }
  }
  catch (error) {
    console.error('AI summary failed:', error)
    return {
      summary: 'AI summary failed. See full release notes.',
      breakingChanges: [],
      newFeatures: [],
      importance: 'minor',
      relevanceScore: 50
    }
  }
}

// Main sync function
async function syncChangelogs() {
  console.log('Starting changelog sync...')

  const packages = loadPackages()
  const data = loadReleases()
  const existingIds = new Set(data.releases.map(r => r.id))

  let newCount = 0
  let errorCount = 0

  for (const pkg of packages) {
    console.log(`Fetching releases for ${pkg.name} (${pkg.repo})...`)

    try {
      const releases = await fetchGitHubReleases(pkg.repo)

      for (const release of releases) {
        const releaseId = `${pkg.repo}:${release.id}`

        // Skip if already processed
        if (existingIds.has(releaseId)) {
          continue
        }

        console.log(`  Processing ${pkg.name}@${release.tag_name}...`)

        // Generate AI summary
        const summary = await generateAISummary(
          pkg.name,
          release.tag_name,
          release.body
        )

        // Create release entry
        const newRelease: ChangelogRelease = {
          id: releaseId,
          packageName: pkg.name,
          packageRepo: pkg.repo,
          packagePriority: pkg.priority,
          tagName: release.tag_name,
          name: release.name,
          body: release.body,
          htmlUrl: release.html_url,
          publishedAt: release.published_at,
          isPrerelease: release.prerelease,
          summary: summary.summary,
          breakingChanges: summary.breakingChanges,
          newFeatures: summary.newFeatures,
          importance: summary.importance,
          relevanceScore: summary.relevanceScore,
          processedAt: new Date().toISOString(),
          model: process.env.ANTHROPIC_API_KEY ? 'claude-3-5-haiku-20241022' : null
        }

        data.releases.push(newRelease)
        newCount++

        // Rate limit: wait between AI calls
        if (process.env.ANTHROPIC_API_KEY) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }
    catch (error) {
      console.error(`Error processing ${pkg.name}:`, error)
      errorCount++
    }

    // Rate limit: wait between packages
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Sort by published date (newest first) and trim to max
  data.releases.sort((a, b) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )
  data.releases = data.releases.slice(0, MAX_RELEASES_TO_KEEP)

  // Update sync timestamp
  data.lastSyncedAt = new Date().toISOString()

  // Save
  saveReleases(data)

  console.log(`\nSync complete:`)
  console.log(`  New releases: ${newCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Total releases: ${data.releases.length}`)
}

// Run
syncChangelogs().catch((error) => {
  console.error('Sync failed:', error)
  process.exit(1)
})
