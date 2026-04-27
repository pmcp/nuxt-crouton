import { getKvrWerkvergunningensByIds, updateKvrWerkvergunningen } from '../../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const { werkvergunningenId } = getRouterParams(event)
  if (!werkvergunningenId) {
    throw createError({ status: 400, statusText: 'Missing werkvergunningenId' })
  }

  const rows = await getKvrWerkvergunningensByIds(team.id, [werkvergunningenId])
  const record = rows?.[0]
  if (!record) {
    throw createError({ status: 404, statusText: 'Werkvergunning not found' })
  }

  const emailResult = await sendWerkvergunningEmail(record as any, event)

  try {
    await updateKvrWerkvergunningen(
      record.id,
      team.id,
      user.id,
      { emailStatus: emailResult.status },
      { role: membership?.role }
    )
  }
  catch (err) {
    console.error('[kvr] Failed to update emailStatus after resend:', err)
  }

  return {
    id: record.id,
    recipientEmail: record.recipientEmail,
    emailStatus: emailResult.status,
    emailError: emailResult.error,
  }
})
