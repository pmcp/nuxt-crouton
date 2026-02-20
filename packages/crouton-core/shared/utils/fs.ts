/**
 * Shared filesystem utilities for crouton CLI tools
 */

import fsp from 'node:fs/promises'

/**
 * Check if a file or directory exists at the given path.
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fsp.access(path)
    return true
  } catch {
    return false
  }
}
