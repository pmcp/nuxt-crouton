import { useDB, tables, eq, and } from './database'

/**
 * Resolve an organization/team name from a request hostname.
 *
 * Looks up a verified domain record matching `host` and returns the
 * owning organization's name. Returns `undefined` when the host is
 * not mapped to any verified domain (e.g. localhost or the main app domain).
 */
export async function resolveTeamBrandFromHost(host: string): Promise<string | undefined> {
  // Strip port if present (e.g. localhost:3000 → localhost)
  const hostname = host.includes(':') ? host.split(':')[0]! : host

  const result = await useDB()
    .select({ name: tables.organization.name })
    .from(tables.domain)
    .innerJoin(tables.organization, eq(tables.domain.organizationId, tables.organization.id))
    .where(and(
      eq(tables.domain.domain, hostname),
      eq(tables.domain.status, 'verified')
    ))
    .get()

  return result?.name
}
