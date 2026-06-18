/**
 * Shared API-key auth check for /api/print-server/* endpoints.
 *
 * Validates the `x-api-key` header against runtimeConfig.croutonSales.printApiKey.
 * Default key is '1234' (matches the dev default in the polling spooler script).
 * Override in production via env: NUXT_CROUTON_SALES_PRINT_API_KEY.
 */
import type { H3Event } from 'h3'

export function requirePrintServerKey(event: H3Event): void {
  const config = useRuntimeConfig(event)
  const expected = (config.croutonSales as { printApiKey?: string } | undefined)?.printApiKey || '1234'
  const got = getHeader(event, 'x-api-key')

  if (got !== expected) {
    throw createError({ status: 401, statusText: 'Invalid API key' })
  }
}
