import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesEventsettings } from '~~/layers/sales/collections/eventsettings/server/database/schema'

export interface ReceiptSettings {
  special_instructions_title: string
  staff_order_header: string
  footer_text: string
}

const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  special_instructions_title: 'SPECIAL INSTRUCTIONS:',
  staff_order_header: '*** STAFF ORDER ***',
  footer_text: 'Thank you for your order!'
}

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const db = useDB()

  const [existing] = await db
    .select()
    .from(salesEventsettings)
    .where(
      and(
        eq(salesEventsettings.teamId, team.id),
        eq(salesEventsettings.eventId, eventId),
        eq(salesEventsettings.settingKey, 'receipt_settings')
      )
    )

  if (existing?.settingValue) {
    try {
      return JSON.parse(existing.settingValue) as ReceiptSettings
    }
    catch {
      return DEFAULT_RECEIPT_SETTINGS
    }
  }

  return DEFAULT_RECEIPT_SETTINGS
})
