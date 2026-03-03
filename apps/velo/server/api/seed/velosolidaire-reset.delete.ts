/**
 * Cleanup endpoint for Vélo Solidaire org data.
 * Removes the org and all associated data so it can be re-seeded.
 *
 * Trigger via DELETE /api/seed/velosolidaire-reset
 */
import { eq } from 'drizzle-orm'
import { organization, member } from '~~/server/db/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'
import { bookingsSettings } from '~~/layers/bookings/collections/settings/server/database/schema'
import { bookingsEmailtemplates } from '~~/layers/bookings/collections/emailtemplates/server/database/schema'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsEmaillogs } from '~~/layers/bookings/collections/emaillogs/server/database/schema'
import { pagesPages } from '~~/layers/pages/collections/pages/server/database/schema'

export default defineEventHandler(async () => {
  if (!import.meta.dev) {
    throw createError({ status: 403, statusText: 'Only available in development' })
  }

  const db = useDB()
  const log: string[] = []

  // Find the org
  const orgs = await (db as any).select().from(organization).where(eq(organization.slug, 'velo-solidaire')).limit(1)
  if (orgs.length === 0) {
    return { success: true, message: 'Organization velo-solidaire not found, nothing to clean' }
  }

  const orgId = orgs[0].id

  // Delete in reverse dependency order
  const emailLogs = await (db as any).delete(bookingsEmaillogs).where(eq(bookingsEmaillogs.teamId, orgId))
  log.push(`Deleted email logs`)

  await (db as any).delete(bookingsBookings).where(eq(bookingsBookings.teamId, orgId))
  log.push(`Deleted bookings`)

  await (db as any).delete(bookingsEmailtemplates).where(eq(bookingsEmailtemplates.teamId, orgId))
  log.push(`Deleted email templates`)

  await (db as any).delete(bookingsSettings).where(eq(bookingsSettings.teamId, orgId))
  log.push(`Deleted booking settings`)

  await (db as any).delete(bookingsLocations).where(eq(bookingsLocations.teamId, orgId))
  log.push(`Deleted locations`)

  await (db as any).delete(pagesPages).where(eq(pagesPages.teamId, orgId))
  log.push(`Deleted pages`)

  await (db as any).delete(member).where(eq(member.organizationId, orgId))
  log.push(`Deleted members`)

  await (db as any).delete(organization).where(eq(organization.id, orgId))
  log.push(`Deleted organization`)

  // Note: user accounts are NOT deleted — they may belong to other orgs

  return { success: true, summary: log }
})
