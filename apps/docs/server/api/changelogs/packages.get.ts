import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ChangelogPackagesConfig } from '~~/shared/types/changelog'

export default defineEventHandler(() => {
  // Load packages config
  const configPath = resolve(process.cwd(), 'data/changelog-packages.json')

  try {
    const config: ChangelogPackagesConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
    return {
      packages: config.packages.filter((p: ChangelogPackagesConfig['packages'][number]) => p.enabled)
    }
  }
  catch {
    return {
      packages: []
    }
  }
})
