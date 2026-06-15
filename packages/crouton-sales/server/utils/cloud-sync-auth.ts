/**
 * Shared-secret auth for the Pi→cloud sync ingest (#178).
 *
 * Validates the `x-sync-key` header against runtimeConfig.croutonSales.cloudSyncSecret
 * (override via env NUXT_CROUTON_SALES_CLOUD_SYNC_SECRET). Unlike the print-server
 * key, this guards the ONLY writer of mirrored venue data on the cloud, so it is
 * **fail-closed**: when no secret is configured the endpoint rejects everything
 * (there is no usable default — an unset secret must never mean "open").
 */
import type { H3Event } from 'h3'

export function requireCloudSyncKey(event: H3Event): void {
  const config = useRuntimeConfig(event)
  const expected = (config.croutonSales as { cloudSyncSecret?: string } | undefined)?.cloudSyncSecret

  // Fail closed: no secret set ⇒ no access (don't fall back to a default).
  if (!expected) {
    throw createError({ status: 503, statusText: 'Cloud sync not configured' })
  }

  const got = getHeader(event, 'x-sync-key')
  if (got !== expected) {
    throw createError({ status: 401, statusText: 'Invalid sync key' })
  }
}
