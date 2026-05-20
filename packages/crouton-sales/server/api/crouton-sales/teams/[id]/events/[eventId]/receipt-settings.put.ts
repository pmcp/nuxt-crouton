import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { salesEventsettings } from '~~/layers/sales/collections/eventsettings/server/database/schema'

export interface ReceiptSettings {
  items_section_title: string
  special_instructions_title: string
  complete_order_header: string
  staff_order_header: string
  footer_text: string
  test_title: string
  test_success_message: string
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const eventId = getRouterParam(event, 'eventId')

  if (!eventId) {
    throw createError({ status: 400, statusText: 'Event ID is required' })
  }

  const body = await readBody<ReceiptSettings>(event)

  if (!body) {
    throw createError({ status: 400, statusText: 'Request body is required' })
  }

  const db = useDB()
  const settingValue = JSON.stringify(body)

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

  if (existing) {
    await db
      .update(salesEventsettings)
      .set({ settingValue, updatedBy: user.id })
      .where(eq(salesEventsettings.id, existing.id))
  }
  else {
    await db.insert(salesEventsettings).values({
      id: nanoid(),
      teamId: team.id,
      owner: user.id,
      eventId,
      settingKey: 'receipt_settings',
      settingValue,
      description: 'Receipt text customization settings',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.id,
      updatedBy: user.id
    })
  }

  return { success: true }
})
