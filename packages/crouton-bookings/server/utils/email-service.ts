/**
 * Booking Email Service
 *
 * Complete email sending service for crouton-bookings that:
 * 1. Fetches active templates by triggerType
 * 2. Replaces template variables with booking data
 * 3. Sends via configured email provider
 * 4. Logs results to emaillogs collection
 *
 * Required setup:
 * - Enable: runtimeConfig.croutonBookings.email.enabled = true
 * - Install: @fyit/crouton-email (or implement custom email provider)
 * - Generate: email-template and email-log collections
 */
import { eq, and } from 'drizzle-orm'
import {
  isBookingEmailEnabled,
  getBookingEmailService,
  renderBookingEmailTemplate,
  formatBookingEmailDate,
  type BookingEmailTriggerType,
  type BookingEmailResult,
  type BookingEmailVariables,
  type BookingWithEmailContext
} from './booking-emails'

/**
 * Extended booking context with team information
 */
export interface BookingEmailContext extends BookingWithEmailContext {
  teamName?: string
}

/**
 * Email send options
 */
export interface SendBookingEmailOptions {
  booking: BookingEmailContext
  triggerType: BookingEmailTriggerType
  teamId: string
  userId: string
  /** Override recipient email (default: uses booking owner's email) */
  recipientEmail?: string
  /** Admin email for 'admin' or 'both' recipient types */
  adminEmail?: string
}

/**
 * Result from sending booking email(s)
 */
export interface SendBookingEmailsResult {
  success: boolean
  customerResult?: BookingEmailResult
  adminResult?: BookingEmailResult
  errors?: string[]
}

/**
 * Get active email templates for a trigger type
 */
export async function getActiveTemplatesForTrigger(
  teamId: string,
  triggerType: BookingEmailTriggerType,
  locationId?: string | null
): Promise<any[]> {
  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return []
  }

  const db = useDB()

  try {
    // Dynamic import with @vite-ignore to prevent build-time resolution
    // This allows the collection to be optional
    const schemaPath = '~~/layers/bookings/collections/emailtemplates/server/database/schema'
    const { bookingsEmailtemplates } = await import(/* @vite-ignore */ schemaPath)

    // Build conditions
    const conditions = [
      eq(bookingsEmailtemplates.teamId, teamId),
      eq(bookingsEmailtemplates.triggerType, triggerType),
      eq(bookingsEmailtemplates.isActive, true)
    ]

    const templates = await db
      .select()
      .from(bookingsEmailtemplates)
      .where(and(...conditions))

    // Filter by location: return templates that match the location OR have no location set
    if (locationId) {
      return templates.filter(
        t => !t.locationId || t.locationId === locationId
      )
    }

    return templates
  }
  catch (error) {
    console.error('[booking-email] Failed to fetch templates:', error)
    return []
  }
}

/**
 * Build email variables from booking context
 */
export function buildEmailVariables(
  booking: BookingEmailContext
): BookingEmailVariables {
  const locationData = booking.locationData
  const ownerUser = booking.ownerUser

  // Build full address from parts
  let locationAddress = ''
  if (locationData) {
    const parts = [
      locationData.address,
      (locationData as any).street,
      (locationData as any).city
    ].filter(Boolean)
    locationAddress = parts.join(', ')
  }

  return {
    customer_name: ownerUser?.name || 'Customer',
    customer_email: ownerUser?.email || '',
    booking_date: formatBookingEmailDate(booking.date),
    booking_slot: Array.isArray(booking.slot)
      ? booking.slot.join(', ')
      : booking.slot || 'Not specified',
    location_name: locationData?.name || 'Location',
    location_address: locationAddress,
    team_name: booking.teamName || 'Your Team'
  }
}

/**
 * Extended variables with location parts for template compatibility
 */
export interface ExtendedEmailVariables extends BookingEmailVariables {
  location_title: string
  location_street: string
  location_city: string
}

/**
 * Build extended email variables with individual location fields
 */
export function buildExtendedEmailVariables(
  booking: BookingEmailContext
): ExtendedEmailVariables {
  const base = buildEmailVariables(booking)
  const locationData = booking.locationData as any

  return {
    ...base,
    location_title: locationData?.title || locationData?.name || 'Location',
    location_street: locationData?.street || '',
    location_city: locationData?.city || ''
  }
}

/**
 * Log email send attempt to emaillogs collection
 */
export async function logEmailSend(options: {
  teamId: string
  userId: string
  bookingId: string
  templateId: string
  recipientEmail: string
  triggerType: string
  status: 'pending' | 'sent' | 'failed'
  error?: string
}): Promise<string | null> {
  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return null
  }

  const db = useDB()

  try {
    // Dynamic import with @vite-ignore to prevent build-time resolution
    const schemaPath = '~~/layers/bookings/collections/emaillogs/server/database/schema'
    const { bookingsEmaillogs } = await import(/* @vite-ignore */ schemaPath)

    const [log] = await db
      .insert(bookingsEmaillogs)
      .values({
        teamId: options.teamId,
        owner: options.userId,
        bookingId: options.bookingId,
        templateId: options.templateId,
        recipientEmail: options.recipientEmail,
        triggerType: options.triggerType,
        status: options.status,
        sentAt: options.status === 'sent' ? new Date().toISOString() : null,
        error: options.error || null,
        createdBy: options.userId,
        updatedBy: options.userId
      })
      .returning()

    return log?.id || null
  }
  catch (error) {
    console.error('[booking-email] Failed to log email send:', error)
    return null
  }
}

/**
 * Update email log status
 */
export async function updateEmailLogStatus(
  logId: string,
  status: 'sent' | 'failed',
  error?: string
): Promise<void> {
  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return
  }

  const db = useDB()

  try {
    // Dynamic import with @vite-ignore to prevent build-time resolution
    const schemaPath = '~~/layers/bookings/collections/emaillogs/server/database/schema'
    const { bookingsEmaillogs } = await import(/* @vite-ignore */ schemaPath)

    await db
      .update(bookingsEmaillogs)
      .set({
        status,
        sentAt: status === 'sent' ? new Date().toISOString() : null,
        error: error || null
      })
      .where(eq(bookingsEmaillogs.id, logId))
  }
  catch (error) {
    console.error('[booking-email] Failed to update email log:', error)
  }
}

/**
 * Render booking email template with variables
 */
export function renderBookingEmail(
  template: { subject: string; body: string },
  variables: ExtendedEmailVariables
): { subject: string; body: string } {
  // Extend the base render function to handle all variable formats
  const allVariables = {
    ...variables,
    // Also support underscore format for backwards compatibility
    location_address: variables.location_address || [
      variables.location_street,
      variables.location_city
    ].filter(Boolean).join(', ')
  }

  return {
    subject: renderBookingEmailTemplate(template.subject, allVariables as any),
    body: renderBookingEmailTemplate(template.body, allVariables as any)
  }
}

/**
 * Custom email provider type for apps that don't use crouton-email
 */
export interface CustomEmailProvider {
  send(options: {
    to: string
    subject: string
    html: string
    from?: string
  }): Promise<{ success: boolean; id?: string; error?: string }>
}

// Global storage for custom email provider
let _customEmailProvider: CustomEmailProvider | null = null

/**
 * Register a custom email provider
 *
 * Use this in a Nitro plugin to provide your own email sending implementation.
 *
 * @example
 * // server/plugins/email.ts
 * import { registerEmailProvider } from '@fyit/crouton-bookings/server/utils/email-service'
 * import { Resend } from 'resend'
 *
 * export default defineNitroPlugin(() => {
 *   const resend = new Resend(process.env.RESEND_API_KEY)
 *
 *   registerEmailProvider({
 *     async send({ to, subject, html, from }) {
 *       const { data, error } = await resend.emails.send({
 *         from: from || 'noreply@example.com',
 *         to,
 *         subject,
 *         html
 *       })
 *       return { success: !error, id: data?.id, error: error?.message }
 *     }
 *   })
 * })
 */
export function registerEmailProvider(provider: CustomEmailProvider): void {
  _customEmailProvider = provider
}

/**
 * Get the configured email provider (custom or crouton-email)
 */
async function getEmailProvider(): Promise<CustomEmailProvider | null> {
  // Check for custom provider first
  if (_customEmailProvider) {
    return _customEmailProvider
  }

  // Fall back to crouton-email if available
  const croutonEmailService = await getBookingEmailService()
  if (croutonEmailService) {
    return {
      async send(options) {
        return croutonEmailService.sendEmail(options)
      }
    }
  }

  return null
}

/**
 * Send a single email using the configured email provider
 */
async function sendSingleEmail(options: {
  to: string
  subject: string
  html: string
  from?: string
}): Promise<{ success: boolean; error?: string }> {
  const provider = await getEmailProvider()

  if (!provider) {
    console.warn('[booking-email] No email provider configured. Either register a custom provider or install @fyit/crouton-email.')
    return {
      success: false,
      error: 'No email provider configured. Either register a custom provider or install @fyit/crouton-email.'
    }
  }

  console.log('[booking-email] Sending email to:', options.to, '| Subject:', options.subject)

  try {
    const result = await provider.send({
      to: options.to,
      subject: options.subject,
      html: options.html,
      from: options.from
    })

    if (result.success) {
      console.log('[booking-email] ✓ Email sent successfully to:', options.to)
    } else {
      console.error('[booking-email] ✗ Email failed:', result.error)
    }

    return {
      success: result.success,
      error: result.error
    }
  }
  catch (error: any) {
    console.error('[booking-email] ✗ Email exception:', error.message)
    return {
      success: false,
      error: error.message || 'Failed to send email'
    }
  }
}

/**
 * Send booking email(s) for a specific trigger
 *
 * This is the main entry point for sending booking-related emails.
 * It handles:
 * - Finding active templates for the trigger type
 * - Building email variables from booking data
 * - Sending to customer, admin, or both based on template config
 * - Logging all send attempts
 */
export async function sendBookingEmails(
  options: SendBookingEmailOptions
): Promise<SendBookingEmailsResult> {
  // Check if email is enabled
  if (!isBookingEmailEnabled()) {
    return {
      success: false,
      errors: ['Email module is not enabled']
    }
  }

  const { booking, triggerType, teamId, userId, adminEmail } = options

  // Get templates for this trigger
  const templates = await getActiveTemplatesForTrigger(
    teamId,
    triggerType,
    booking.location
  )

  if (templates.length === 0) {
    return {
      success: true,
      errors: [`No active templates found for trigger: ${triggerType}`]
    }
  }

  // Build email variables
  const variables = buildExtendedEmailVariables(booking)

  const results: SendBookingEmailsResult = {
    success: true,
    errors: []
  }

  // Process each matching template
  for (const template of templates) {
    const { subject, body } = renderBookingEmail(
      { subject: template.subject, body: template.body },
      variables
    )

    const recipientType = template.recipientType || 'customer'

    // Send to customer
    if (recipientType === 'customer' || recipientType === 'both') {
      const customerEmail = options.recipientEmail || variables.customer_email

      if (customerEmail) {
        // Log pending
        const logId = await logEmailSend({
          teamId,
          userId,
          bookingId: booking.id,
          templateId: template.id,
          recipientEmail: customerEmail,
          triggerType,
          status: 'pending'
        })

        // Send
        const result = await sendSingleEmail({
          to: customerEmail,
          subject,
          html: body,
          from: template.fromEmail
        })

        // Update log
        if (logId) {
          await updateEmailLogStatus(
            logId,
            result.success ? 'sent' : 'failed',
            result.error
          )
        }

        results.customerResult = {
          success: result.success,
          sent: result.success,
          templateId: template.id,
          emailLogId: logId || undefined,
          error: result.error
        }

        if (!result.success) {
          results.success = false
          results.errors?.push(`Customer email failed: ${result.error}`)
        }
      }
      else {
        results.errors?.push('No customer email available')
      }
    }

    // Send to admin
    if ((recipientType === 'admin' || recipientType === 'both') && adminEmail) {
      // Log pending
      const logId = await logEmailSend({
        teamId,
        userId,
        bookingId: booking.id,
        templateId: template.id,
        recipientEmail: adminEmail,
        triggerType,
        status: 'pending'
      })

      // Send
      const result = await sendSingleEmail({
        to: adminEmail,
        subject: `[Admin] ${subject}`,
        html: body,
        from: template.fromEmail
      })

      // Update log
      if (logId) {
        await updateEmailLogStatus(
          logId,
          result.success ? 'sent' : 'failed',
          result.error
        )
      }

      results.adminResult = {
        success: result.success,
        sent: result.success,
        templateId: template.id,
        emailLogId: logId || undefined,
        error: result.error
      }

      if (!result.success) {
        results.success = false
        results.errors?.push(`Admin email failed: ${result.error}`)
      }
    }
  }

  return results
}

/**
 * Trigger booking_created emails
 *
 * Call this after a new booking is created.
 */
export async function triggerBookingCreatedEmail(
  booking: BookingEmailContext,
  teamId: string,
  userId: string,
  adminEmail?: string
): Promise<SendBookingEmailsResult> {
  return sendBookingEmails({
    booking,
    triggerType: 'booking_created',
    teamId,
    userId,
    adminEmail
  })
}

/**
 * Trigger booking_cancelled emails
 *
 * Call this when a booking is cancelled.
 */
export async function triggerBookingCancelledEmail(
  booking: BookingEmailContext,
  teamId: string,
  userId: string,
  adminEmail?: string
): Promise<SendBookingEmailsResult> {
  return sendBookingEmails({
    booking,
    triggerType: 'booking_cancelled',
    teamId,
    userId,
    adminEmail
  })
}

/**
 * Get email statistics for a booking
 */
export async function getBookingEmailStats(
  bookingId: string,
  teamId: string
): Promise<{ total: number; sent: number; pending: number; failed: number }> {
  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return { total: 0, sent: 0, pending: 0, failed: 0 }
  }

  const db = useDB()

  try {
    // Dynamic import with @vite-ignore to prevent build-time resolution
    const schemaPath = '~~/layers/bookings/collections/emaillogs/server/database/schema'
    const { bookingsEmaillogs } = await import(/* @vite-ignore */ schemaPath)

    const logs = await db
      .select({
        status: bookingsEmaillogs.status
      })
      .from(bookingsEmaillogs)
      .where(
        and(
          eq(bookingsEmaillogs.bookingId, bookingId),
          eq(bookingsEmaillogs.teamId, teamId)
        )
      )

    return {
      total: logs.length,
      sent: logs.filter(l => l.status === 'sent').length,
      pending: logs.filter(l => l.status === 'pending').length,
      failed: logs.filter(l => l.status === 'failed').length
    }
  }
  catch (error) {
    console.error('[booking-email] Failed to get email stats:', error)
    return { total: 0, sent: 0, pending: 0, failed: 0 }
  }
}

/**
 * Email trigger status for UI display
 */
export interface EmailTriggerStatusResult {
  triggerType: BookingEmailTriggerType
  status: 'sent' | 'pending' | 'failed' | 'not_sent'
  sentAt?: string | null
  scheduledFor?: string | null
}

/**
 * Get detailed email status per trigger type for a booking
 * Returns status for all email types with scheduled dates based on templates
 */
export async function getBookingEmailDetails(
  bookingId: string,
  teamId: string,
  bookingDate: string | Date,
  bookingCreatedAt?: string | Date | null
): Promise<EmailTriggerStatusResult[]> {
  const results: EmailTriggerStatusResult[] = []

  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return results
  }

  const db = useDB()

  try {
    // Dynamic imports with @vite-ignore to prevent build-time resolution
    const emailLogsPath = '~~/layers/bookings/collections/emaillogs/server/database/schema'
    const emailTemplatesPath = '~~/layers/bookings/collections/emailtemplates/server/database/schema'
    const { bookingsEmaillogs } = await import(/* @vite-ignore */ emailLogsPath)
    const { bookingsEmailtemplates } = await import(/* @vite-ignore */ emailTemplatesPath)

    // Get all email logs for this booking
    const logs = await db
      .select({
        triggerType: bookingsEmaillogs.triggerType,
        status: bookingsEmaillogs.status,
        sentAt: bookingsEmaillogs.sentAt,
      })
      .from(bookingsEmaillogs)
      .where(
        and(
          eq(bookingsEmaillogs.bookingId, bookingId),
          eq(bookingsEmaillogs.teamId, teamId)
        )
      )

    // Get active templates to know scheduled dates
    const templates = await db
      .select({
        triggerType: bookingsEmailtemplates.triggerType,
        daysOffset: bookingsEmailtemplates.daysOffset,
      })
      .from(bookingsEmailtemplates)
      .where(
        and(
          eq(bookingsEmailtemplates.teamId, teamId),
          eq(bookingsEmailtemplates.isActive, true)
        )
      )

    const booking = new Date(bookingDate)
    const hasConfirmationTemplate = templates.some(t => t.triggerType === 'booking_created')

    // Process confirmation (booking_created) - sent immediately when booked
    const confirmationLog = logs.find(l => l.triggerType === 'booking_created')
    if (confirmationLog) {
      results.push({
        triggerType: 'booking_created',
        status: confirmationLog.status as any,
        sentAt: confirmationLog.sentAt || null,
      })
    } else if (hasConfirmationTemplate) {
      // Should have been sent when booking was created
      results.push({
        triggerType: 'booking_created',
        status: 'not_sent',
        scheduledFor: bookingCreatedAt ? new Date(bookingCreatedAt).toISOString() : null,
      })
    } else {
      results.push({
        triggerType: 'booking_created',
        status: 'not_sent',
        sentAt: null,
      })
    }

    // Process reminder (reminder_before) - sent X days before event
    const reminderLog = logs.find(l => l.triggerType === 'reminder_before')
    const reminderTemplate = templates.find(t => t.triggerType === 'reminder_before')

    if (reminderLog) {
      results.push({
        triggerType: 'reminder_before',
        status: reminderLog.status as any,
        sentAt: reminderLog.sentAt || null,
      })
    } else if (reminderTemplate) {
      // Calculate when reminder will be sent (daysOffset days before booking)
      const daysOffset = Math.abs(reminderTemplate.daysOffset || 1)
      const scheduledDate = new Date(booking)
      scheduledDate.setDate(scheduledDate.getDate() - daysOffset)

      results.push({
        triggerType: 'reminder_before',
        status: 'not_sent',
        scheduledFor: scheduledDate.toISOString(),
      })
    } else {
      results.push({
        triggerType: 'reminder_before',
        status: 'not_sent',
        sentAt: null,
      })
    }

    // Process cancellation (booking_cancelled) - sent when cancelled, no schedule
    const cancelLog = logs.find(l => l.triggerType === 'booking_cancelled')
    results.push({
      triggerType: 'booking_cancelled',
      status: cancelLog?.status as any || 'not_sent',
      sentAt: cancelLog?.sentAt || null,
    })

    // Process follow-up (follow_up_after) - sent X days after event
    const followUpLog = logs.find(l => l.triggerType === 'follow_up_after')
    const followUpTemplate = templates.find(t => t.triggerType === 'follow_up_after')

    if (followUpLog) {
      results.push({
        triggerType: 'follow_up_after',
        status: followUpLog.status as any,
        sentAt: followUpLog.sentAt || null,
      })
    } else if (followUpTemplate) {
      // Calculate when follow-up will be sent (daysOffset days after booking)
      const daysOffset = Math.abs(followUpTemplate.daysOffset || 1)
      const scheduledDate = new Date(booking)
      scheduledDate.setDate(scheduledDate.getDate() + daysOffset)

      results.push({
        triggerType: 'follow_up_after',
        status: 'not_sent',
        scheduledFor: scheduledDate.toISOString(),
      })
    } else {
      results.push({
        triggerType: 'follow_up_after',
        status: 'not_sent',
        sentAt: null,
      })
    }

    return results
  }
  catch (error) {
    console.error('[booking-email] Failed to get email details:', error)
    return results
  }
}
