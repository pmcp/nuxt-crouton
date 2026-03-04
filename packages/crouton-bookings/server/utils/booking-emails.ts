/**
 * Booking email utilities for crouton-bookings
 *
 * These utilities integrate with @fyit/crouton-email when available.
 * Users must:
 * 1. Enable email: runtimeConfig.croutonBookings.email.enabled = true
 * 2. Install @fyit/crouton-email
 * 3. Generate email-template and email-log schemas if using template system
 */

/**
 * Resolve a translated field value from the translations JSON column.
 * Falls back to the base column value if no translation is found.
 */
export function resolveTranslatedField(
  baseValue: string | null | undefined,
  translations: Record<string, Record<string, string>> | null | undefined,
  field: string,
  locale: string = 'en'
): string {
  return translations?.[locale]?.[field] || baseValue || ''
}

/**
 * Resolve slot IDs to human-readable labels using the location's slots config.
 * Falls back to the raw ID if no matching slot is found.
 */
export function resolveSlotLabels(
  slotIds: string[] | null,
  locationSlots: Array<{ id: string; label?: string }> | null | undefined
): string {
  if (!slotIds || slotIds.length === 0) return 'Not specified'

  const slotMap = new Map(
    (locationSlots || []).map(s => [s.id, s.label || s.id])
  )

  return slotIds
    .map(id => {
      if (id === 'all-day') return 'All Day'
      return slotMap.get(id) || id
    })
    .join(', ')
}

export type BookingEmailTriggerType = 'booking_created' | 'reminder_before' | 'booking_cancelled' | 'follow_up_after'
export type BookingEmailRecipientType = 'customer' | 'admin' | 'both'

export interface BookingEmailTemplate {
  id: string
  teamId: string
  name: string
  subject: string
  body: string
  triggerType: BookingEmailTriggerType
  recipientType: BookingEmailRecipientType
  locationId?: string | null
  isActive: boolean
}

export interface BookingWithEmailContext {
  id: string
  teamId: string
  owner: string
  location: string
  date: Date | string | null
  slot: string[] | null
  status: string
  locationData?: {
    id: string
    name: string
    title?: string
    street?: string
    city?: string
    content?: string
    address?: string
  } | null
  ownerUser?: {
    id: string
    name: string
    email: string
  } | null
}

export interface BookingEmailVariables {
  customer_name: string
  customer_email: string
  booking_date: string
  booking_slot: string
  booking_reference: string
  location_name: string
  location_address: string
  team_name: string
  team_email: string
  team_phone: string
}

export interface BookingEmailResult {
  success: boolean
  sent: boolean
  templateId?: string
  emailLogId?: string
  error?: string
  skipped?: boolean
  reason?: string
}

/**
 * Check if email module is enabled
 */
export function isBookingEmailEnabled(): boolean {
  const event = tryUseEvent()
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  return (config as any).croutonBookings?.email?.enabled === true
}

/**
 * Render a template string by replacing {{ variable }} placeholders
 */
export function renderBookingEmailTemplate(
  template: string,
  variables: BookingEmailVariables
): string {
  let rendered = template

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    rendered = rendered.replace(regex, value || '')
  })

  return rendered
}

/**
 * Map a short locale code to an Intl-compatible locale string.
 */
function toIntlLocale(locale?: string): string {
  if (!locale) return 'en-US'
  const map: Record<string, string> = {
    en: 'en-US',
    nl: 'nl-NL',
    fr: 'fr-FR',
    de: 'de-DE',
    es: 'es-ES',
    it: 'it-IT',
    pt: 'pt-PT',
  }
  return map[locale] || locale
}

/**
 * Format a booking date for display in emails
 */
export function formatBookingEmailDate(date: Date | string | null, locale?: string): string {
  if (!date) return 'Not specified'
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dateObj)
}

/**
 * Build email variables from a booking with relations
 */
export function buildBookingEmailVariables(
  booking: BookingWithEmailContext,
  teamName: string = 'Your Team',
  locale?: string
): BookingEmailVariables {
  return {
    customer_name: booking.ownerUser?.name || 'Customer',
    customer_email: booking.ownerUser?.email || '',
    booking_date: formatBookingEmailDate(booking.date, locale),
    booking_slot: booking.slot?.join(', ') || 'Not specified',
    booking_reference: booking.id,
    location_name: booking.locationData?.name || 'Location',
    location_address: booking.locationData?.address || '',
    team_name: teamName,
    team_email: '',
    team_phone: ''
  }
}

/**
 * Abstract interface for email service integration
 * Consuming apps should implement this or use the default crouton-email integration
 */
export interface BookingEmailService {
  sendEmail(options: {
    to: string
    subject: string
    html: string
    text?: string
  }): Promise<{ success: boolean; id?: string; error?: string }>
}

/**
 * Get the email service from crouton-email if available
 * Returns null if crouton-email is not installed
 */
export async function getBookingEmailService(): Promise<BookingEmailService | null> {
  // Early return if email is not enabled
  if (!isBookingEmailEnabled()) {
    return null
  }

  try {
    // Try to import from crouton-email - this will fail if not installed
    // Using @vite-ignore to prevent build-time resolution when not installed
    const emailPath = '#crouton-email/server/utils/email'
    const { useEmailService } = await import(/* @vite-ignore */ emailPath)
    const emailService = useEmailService()

    return {
      async sendEmail(options) {
        const result = await emailService.send({
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text
        })
        return {
          success: result.success,
          id: result.id,
          error: result.error
        }
      }
    }
  } catch {
    // crouton-email not available
    return null
  }
}
