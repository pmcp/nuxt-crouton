import { defineEventHandler } from 'h3'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Get generator history from .crouton-generation-history.json
 * GET /__nuxt_crouton_devtools/api/generation-history
 */
export default defineEventHandler((_event) => {
  const cwd = process.cwd()
  const historyPath = resolve(cwd, '.crouton-generation-history.json')

  if (!existsSync(historyPath)) {
    return { history: [], found: false }
  }

  try {
    const raw = readFileSync(historyPath, 'utf-8')
    const history = JSON.parse(raw)
    return { history, found: true }
  } catch {
    return { history: [], found: false, error: 'Failed to parse history file' }
  }
})
