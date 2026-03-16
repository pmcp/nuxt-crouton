/**
 * Resolve team email template overrides from the database.
 *
 * Looks up the team associated with a user's email address (via membership),
 * then returns any email template overrides from teamSettings.emailSettings.
 *
 * Relies on Nitro auto-imports from crouton-auth: db, tables, eq
 */

/** Email template types that can be customized */
export type EmailTemplateType = 'password-reset' | 'verification' | 'magic-link' | 'team-invite' | 'welcome'

/** Customizable content fields per template */
export interface EmailTemplateOverrides {
  subject?: string
  greeting?: string
  body?: string
  buttonText?: string
  footer?: string
}

/**
 * Resolve email template overrides for a specific email type.
 *
 * @param emailType - The email template type (e.g. 'password-reset')
 * @param context - Resolution context: user email, org name, or team ID
 * @returns Template overrides or undefined if none configured
 */
export async function resolveEmailOverrides(
  emailType: EmailTemplateType,
  context: { userEmail?: string, organizationName?: string, teamId?: string }
): Promise<EmailTemplateOverrides | undefined> {
  try {
    const teamId = context.teamId || await resolveTeamId(context)
    if (!teamId) return undefined

    const settings = await db
      .select({ emailSettings: tables.teamSettings.emailSettings })
      .from(tables.teamSettings)
      .where(eq(tables.teamSettings.teamId, teamId))
      .get()

    return settings?.emailSettings?.[emailType] ?? undefined
  }
  catch {
    // Never let override resolution break email sending
    return undefined
  }
}

/**
 * Resolve a team ID from available context.
 */
async function resolveTeamId(context: { userEmail?: string, organizationName?: string }): Promise<string | undefined> {
  // Try by organization name first (used for invitations)
  if (context.organizationName) {
    const org = await db
      .select({ id: tables.organization.id })
      .from(tables.organization)
      .where(eq(tables.organization.name, context.organizationName))
      .get()
    if (org) return org.id
  }

  // Try by user email → find their team membership
  if (context.userEmail) {
    const result = await db
      .select({ organizationId: tables.member.organizationId })
      .from(tables.member)
      .innerJoin(tables.user, eq(tables.member.userId, tables.user.id))
      .where(eq(tables.user.email, context.userEmail))
      .limit(1)
      .get()
    if (result) return result.organizationId
  }

  return undefined
}
