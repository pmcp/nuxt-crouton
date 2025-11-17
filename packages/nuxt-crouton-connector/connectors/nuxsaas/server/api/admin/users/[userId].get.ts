import { eq, or } from 'drizzle-orm'
import type { H3Event } from 'h3'

/**
 * NuxSaaS Single User Endpoint
 *
 * Fetches a single user by ID with subscription data.
 * Used when fetchStrategy is 'restful'.
 *
 * @example
 * GET /api/admin/users/550e8400-e29b-41d4-a716-446655440000
 */
export default createExternalCollectionHandler(
  async (event: H3Event) => {
    // Authenticate the user
    const currentUser = await requireAuth(event)

    // Get user ID from route params
    const userId = getRouterParam(event, 'userId')

    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    // Optional: Allow users to fetch their own data, or require admin
    // Uncomment one of these options based on your security requirements:

    // Option 1: Only admins can fetch any user
    // if (currentUser.role !== 'admin') {
    //   throw createError({
    //     statusCode: 403,
    //     statusMessage: 'Admin access required'
    //   })
    // }

    // Option 2: Users can fetch their own data, admins can fetch anyone
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Access denied'
      })
    }

    try {
      // Get database instance
      const db = await useDB(event)

      // Import schema (use ~~ for server-side imports in Nitro)
      const { user, subscription } = await import('~~/server/database/schema')

      // Fetch user with subscription data
      const userRecord = await db
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
        .where(eq(user.id, userId))
        .limit(1)

      if (!userRecord || userRecord.length === 0) {
        throw createError({
          statusCode: 404,
          statusMessage: 'User not found'
        })
      }

      // Log audit event
      await logAuditEvent({
        userId: currentUser.id,
        category: 'api',
        action: 'get_user',
        targetType: 'user',
        targetId: userId,
        status: 'success'
      })

      // Return as array for transformer
      return userRecord
    } catch (error) {
      // Log failed audit event
      await logAuditEvent({
        userId: currentUser.id,
        category: 'api',
        action: 'get_user',
        targetType: 'user',
        targetId: userId,
        status: 'failure',
        details: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  },

  // Transform NuxSaaS user to Crouton format (same as index.get.ts)
  (nuxsaasUser) => {
    // Determine subscription status
    let subscriptionStatus: 'active' | 'inactive' | 'trialing' | 'canceled' | 'past_due' | null = null

    if (nuxsaasUser.subscriptionStatus) {
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
