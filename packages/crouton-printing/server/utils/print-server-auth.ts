/**
 * Shared API-key auth check for /api/print-server/* endpoints.
 *
 * Validates the `x-api-key` header against runtimeConfig.croutonPrinting.printApiKey
 * (override via env NUXT_CROUTON_PRINTING_PRINT_API_KEY). The legacy
 * croutonSales.printApiKey / NUXT_CROUTON_SALES_PRINT_API_KEY is still honoured
 * during migration. Default key is '1234' (matches the dev default in the RUT956
 * polling spooler script).
 */
import type { H3Event } from 'h3'

export function requirePrintServerKey(event: H3Event): void {
  const config = useRuntimeConfig(event)
  const expected = (config.croutonPrinting as { printApiKey?: string } | undefined)?.printApiKey
    || (config.croutonSales as { printApiKey?: string } | undefined)?.printApiKey
    || '1234'
  const got = getHeader(event, 'x-api-key')

  if (got !== expected) {
    throw createError({ status: 401, statusText: 'Invalid API key' })
  }
}
