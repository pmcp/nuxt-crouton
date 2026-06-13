/**
 * crouton-auth seed provider (#84).
 *
 * Seeds the team (organization) every other provider hangs off, and — only
 * when `--with-staff` is passed — a known staff login so the "Team member?
 * Log in" door can be exercised end to end.
 *
 * Runs first (no `dependsOn`); domain providers depend on `auth`.
 *
 * Pure module: references better-auth table/column names as strings, so it
 * never imports the app's generated schema and loads cleanly under jiti.
 */
import type { SeedProvider, SeedContext } from '@fyit/crouton-core/shared/seed'
import { seedId } from '@fyit/crouton-core/shared/seed'

/** A deterministic, well-known staff account for verification flows. */
const STAFF = {
  email: 'claude-verify@test.local',
  name: 'Claude Verify',
  password: 'VerifyCart2026!'
}

async function seedStaff(ctx: SeedContext) {
  // better-auth stores a scrypt envelope in account.password — hash with its
  // own helper so the seeded credential verifies on login.
  const { hashPassword } = await import('better-auth/crypto')
  const passwordHash = await hashPassword(STAFF.password)

  const userId = seedId('user', STAFF.email)
  const accountId = seedId('account', STAFF.email)
  const memberId = seedId('member', ctx.teamSlug, STAFF.email)

  ctx.upsert('user', { id: userId }, {
    name: STAFF.name,
    email: STAFF.email,
    emailVerified: true,
    role: 'user',
    createdAt: ctx.now,
    updatedAt: ctx.now
  })

  // Credential account (providerId 'credential', accountId === userId is the
  // better-auth convention for email/password).
  ctx.upsert('account', { id: accountId }, {
    userId,
    accountId: userId,
    providerId: 'credential',
    password: passwordHash,
    createdAt: ctx.now,
    updatedAt: ctx.now
  })

  // Owner membership of the seeded team.
  ctx.upsert('member', { id: memberId }, {
    userId,
    organizationId: ctx.teamId,
    role: 'owner',
    createdAt: ctx.now
  })
}

export const provider: SeedProvider = {
  id: 'auth',
  async seed(ctx) {
    ctx.upsert('organization', { id: ctx.teamId }, {
      name: 'Test 1',
      slug: ctx.teamSlug,
      isDefault: false,
      personal: false,
      createdAt: ctx.now
    })

    if (ctx.withStaff) {
      await seedStaff(ctx)
    }
  }
}

export default provider
