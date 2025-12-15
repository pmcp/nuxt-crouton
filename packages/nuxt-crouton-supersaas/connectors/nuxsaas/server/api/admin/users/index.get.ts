import { eq, and, or } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * NuxSaaS Users Collection Endpoint
 *
 * Fetches all users for admin-level CroutonReferenceSelect.
 * Integrates with better-auth and includes subscription data.
 *
 * Query parameters:
 * - includeBanned: Include banned users (default: false)
 * - role: Filter by role (optional)
 * - ids: Comma-separated list of user IDs to fetch (optional)
 *
 * @example
 * GET /api/admin/users?includeBanned=false&role=admin
 * GET /api/admin/users?ids=uuid1,uuid2,uuid3
 */
export default createExternalCollectionHandler(
  async (event: H3Event) => {
    // Authenticate the user
    const currentUser = await requireAuth(event)

    // Optional: Require admin role
    // Uncomment if you want to restrict to admins only
    // if (currentUser.role !== 'admin') {
    //   throw createError({
    //     statusCode: 403,
    //     statusMessage: 'Admin access required'
    //   })
    // }

    // Parse query parameters
    const query = getQuery(event)
    const includeBanned = query.includeBanned === 'true'
    const roleFilter = query.role as string | undefined
    const idsFilter = query.ids ? String(query.ids).split(',') : undefined

    try {
      // Get database instance
      const db = await useDB(event)

      // Import schema (use ~~ for server-side imports in Nitro)
      const { user, subscription } = await import('~~/server/database/schema')

      // Build query conditions
      const conditions = []

      // Filter banned users unless explicitly included
      if (!includeBanned) {
        conditions.push(or(eq(user.banned, false), eq(user.banned, null)))
      }

      // Filter by role if specified
      if (roleFilter) {
        conditions.push(eq(user.role, roleFilter))
      }

      // Filter by IDs if specified
      if (idsFilter && idsFilter.length > 0) {
        // Note: This is a simple implementation. For better performance with many IDs,
        // use Drizzle's inArray operator if available
        conditions.push(or(...idsFilter.map(id => eq(user.id, id))))
      }

      // Fetch users with subscription data (left join)
      const users = await db
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          banned: user.banned,
          emailVerified: user.emailVerified,
          stripeCustomerId: user.stripeCustomerId,
          polarCustomerId: user.polarCustomerId,
          // Subscription data
          subscriptionStatus: subscription.status,
          subscriptionPlan: subscription.plan,
          subscriptionPeriodEnd: subscription.periodEnd,
          subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        })
        .from(user)
        .leftJoin(
          subscription,
          or(
            eq(user.stripeCustomerId, subscription.stripeCustomerId),
            eq(user.polarCustomerId, subscription.stripeCustomerId) // Adjust if using Polar
          )
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)

      // Log audit event
      await logAuditEvent({
        userId: currentUser.id,
        category: 'api',
        action: 'list_users',
        targetType: 'user',
        status: 'success',
        details: JSON.stringify({
          filters: {
            includeBanned,
            role: roleFilter,
            idsCount: idsFilter?.length
          },
          resultCount: users.length
        })
      })

      return users
    } catch (error) {
      // Log failed audit event
      await logAuditEvent({
        userId: currentUser.id,
        category: 'api',
        action: 'list_users',
        targetType: 'user',
        status: 'failure',
        details: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  },

  // Transform NuxSaaS user to Crouton format
  (nuxsaasUser) => {
    // Determine subscription status
    let subscriptionStatus: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due' | null = null

    if (nuxsaasUser.subscriptionStatus) {
      // Map NuxSaaS subscription status to standardized format
      const statusMap: Record<string, typeof subscriptionStatus> = {
        active: 'active',
        incomplete: 'inactive',
        incomplete_expired: 'inactive',
        trialing: 'trialing',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due'
      }
      subscriptionStatus = statusMap[nuxsaasUser.subscriptionStatus as string] || 'inactive'
    }

    return {
      id: nuxsaasUser.id,
      title: nuxsaasUser.name, // Required for CroutonReferenceSelect
      email: nuxsaasUser.email,
      image: nuxsaasUser.image,
      role: nuxsaasUser.role,
      banned: nuxsaasUser.banned,
      emailVerified: nuxsaasUser.emailVerified,
      stripeCustomerId: nuxsaasUser.stripeCustomerId,
      polarCustomerId: nuxsaasUser.polarCustomerId,
      subscriptionStatus,
      subscriptionTier: nuxsaasUser.subscriptionPlan,
      // Additional metadata
      _subscription: {
        periodEnd: nuxsaasUser.subscriptionPeriodEnd,
        cancelAtPeriodEnd: nuxsaasUser.subscriptionCancelAtPeriodEnd
      }
    }
  }
)
