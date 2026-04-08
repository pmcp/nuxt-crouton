import { defineEventHandler, setResponseHeader } from 'h3'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Devtools is dev-only, so reading source files at module load is fine.
// Layout: server-rpc/client.{ts,mjs} → ../client/{template.html,styles.css,app.js,tailwind.config.js}
const here = dirname(fileURLToPath(import.meta.url))
const clientDir = resolve(here, '../client')

const template = readFileSync(resolve(clientDir, 'template.html'), 'utf8')
const styles = readFileSync(resolve(clientDir, 'styles.css'), 'utf8')
const appScript = readFileSync(resolve(clientDir, 'app.js'), 'utf8')
const tailwindConfig = readFileSync(resolve(clientDir, 'tailwind.config.js'), 'utf8')

const HTML_CONTENT = template
  .replace('{{STYLES}}', () => styles)
  .replace('{{APP_SCRIPT}}', () => appScript)
  .replace('{{TAILWIND_CONFIG}}', () => tailwindConfig)

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'X-Frame-Options', 'SAMEORIGIN')
  return HTML_CONTENT
})
