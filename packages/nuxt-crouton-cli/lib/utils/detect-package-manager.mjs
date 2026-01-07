// Detect the package manager used in the current project

import fs from 'fs-extra'
import { join } from 'node:path'

/**
 * Detect which package manager is being used
 * @param {string} [cwd] - Working directory to check (defaults to process.cwd())
 * @returns {'pnpm' | 'yarn' | 'npm'}
 */
export function detectPackageManager(cwd = process.cwd()) {
  // Check for lock files in order of preference
  if (fs.existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm'
  }

  if (fs.existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn'
  }

  if (fs.existsSync(join(cwd, 'package-lock.json'))) {
    return 'npm'
  }

  // Check for packageManager field in package.json
  try {
    const packageJson = fs.readJsonSync(join(cwd, 'package.json'))
    if (packageJson.packageManager) {
      if (packageJson.packageManager.startsWith('pnpm')) return 'pnpm'
      if (packageJson.packageManager.startsWith('yarn')) return 'yarn'
      if (packageJson.packageManager.startsWith('npm')) return 'npm'
    }
  } catch {
    // Ignore errors reading package.json
  }

  // Default to pnpm (preferred in this ecosystem)
  return 'pnpm'
}

/**
 * Get the install command for a package manager
 * @param {'pnpm' | 'yarn' | 'npm'} pm - Package manager
 * @param {string} packageName - Package to install
 * @param {object} [options] - Options
 * @param {boolean} [options.dev] - Install as dev dependency
 * @returns {string}
 */
export function getInstallCommand(pm, packageName, options = {}) {
  const { dev = false } = options

  switch (pm) {
    case 'pnpm':
      return `pnpm add ${dev ? '-D ' : ''}${packageName}`
    case 'yarn':
      return `yarn add ${dev ? '-D ' : ''}${packageName}`
    case 'npm':
    default:
      return `npm install ${dev ? '--save-dev ' : ''}${packageName}`
  }
}
