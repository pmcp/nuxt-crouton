/**
 * Monorepo Detection Utility
 *
 * Detects if the schema designer is running from within the nuxt-crouton monorepo
 * and provides paths to local packages for use in generated apps.
 */

import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface MonorepoContext {
  isMonorepo: boolean
  monorepoRoot: string | null
  packagePaths: {
    auth: string | null
    i18n: string | null
    crouton: string | null
  }
}

/**
 * Detect if running from the nuxt-crouton monorepo
 * Returns context with paths to local packages if available
 */
export function detectMonorepoContext(): MonorepoContext {
  // Try multiple detection strategies
  const __dirname = dirname(fileURLToPath(import.meta.url))

  const possibleRoots = [
    process.cwd(),
    join(process.cwd(), '../..'), // From apps/schema-designer
    join(__dirname, '../../../..') // From packages/nuxt-crouton-schema-designer/server/utils
  ]

  for (const root of possibleRoots) {
    const workspaceFile = join(root, 'pnpm-workspace.yaml')
    const packagesDir = join(root, 'packages')

    if (existsSync(workspaceFile) && existsSync(packagesDir)) {
      // Verify it's the nuxt-crouton monorepo by checking for specific packages
      const authPath = join(packagesDir, 'nuxt-crouton-auth')
      const i18nPath = join(packagesDir, 'nuxt-crouton-i18n')
      const croutonPath = join(packagesDir, 'nuxt-crouton')

      // Only return as monorepo if at least the main crouton package exists
      if (existsSync(croutonPath)) {
        return {
          isMonorepo: true,
          monorepoRoot: root,
          packagePaths: {
            auth: existsSync(authPath) ? authPath : null,
            i18n: existsSync(i18nPath) ? i18nPath : null,
            crouton: croutonPath
          }
        }
      }
    }
  }

  return {
    isMonorepo: false,
    monorepoRoot: null,
    packagePaths: { auth: null, i18n: null, crouton: null }
  }
}

/**
 * Get the dependency value for a package (file: path or npm version)
 */
export function getPackageDependency(
  packageName: 'auth' | 'i18n' | 'crouton',
  context: MonorepoContext,
  npmVersion: string = 'latest'
): string {
  const localPath = context.packagePaths[packageName]

  if (context.isMonorepo && localPath) {
    return `file:${localPath}`
  }

  return npmVersion
}

/**
 * Get the extends layer reference for nuxt.config.ts
 * For local packages, use the absolute path; for npm, use the package name
 */
export function getExtendsReference(
  packageName: 'auth' | 'i18n' | 'crouton',
  context: MonorepoContext
): string {
  const localPath = context.packagePaths[packageName]
  const npmNames = {
    auth: '@friendlyinternet/nuxt-crouton-auth',
    i18n: '@friendlyinternet/nuxt-crouton-i18n',
    crouton: '@friendlyinternet/nuxt-crouton'
  } as const

  if (context.isMonorepo && localPath) {
    return localPath
  }

  return npmNames[packageName]
}
