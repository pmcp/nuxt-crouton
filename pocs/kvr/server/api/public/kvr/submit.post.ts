import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { organization, member } from '@fyit/crouton-auth/server/database/schema/auth'
import {
  kvrWerkvergunningensCableItemSchema,
  kvrWerkvergunningensPhotoItemSchema,
} from '../../../../layers/kvr/collections/werkvergunningens/app/composables/useKvrWerkvergunningens'
import {
  createKvrWerkvergunningen,
  updateKvrWerkvergunningen,
} from '../../../../layers/kvr/collections/werkvergunningens/server/database/queries'
import { kvrSettings } from '../../../../layers/kvr/collections/settings/server/database/schema'

const bodySchema = z.object({
  token: z.string().min(1),
  sblNumber: z.string().min(1),
  datum: z.coerce.date(),
  workType: z.string().min(1),
  cables: z.array(kvrWerkvergunningensCableItemSchema).optional(),
  straat: z.string().min(1),
  huisnummer: z.string().min(1),
  postcode: z.string().min(1),
  gemeente: z.string().min(1),
  lng: z.number().nullable().optional(),
  lat: z.number().nullable().optional(),
  ploegLeden: z.string().optional(),
  plaats: z.string().optional(),
  opgemaaktOp: z.coerce.date().nullable().optional(),
  werkverantwoordelijkeNaam: z.string().optional(),
  werkverantwoordelijkeVoornaam: z.string().optional(),
  werkverantwoordelijkeHoedanigheid: z.string().optional(),
  werkverantwoordelijkeAannemer: z.string().optional(),
  werkverantwoordelijkeHandtekening: z.string().nullable().optional(),
  schakelbevoegdeNaam: z.string().optional(),
  schakelbevoegdeVoornaam: z.string().optional(),
  schakelbevoegdeHandtekening: z.string().nullable().optional(),
  photos: z.array(kvrWerkvergunningensPhotoItemSchema).optional(),
  formPdfPath: z.string().nullable().optional(),
}).strip()

export default defineEventHandler(async (event) => {
  await requirePublicToken(event, { readBody: false })

  const rawBody = await readBody(event)
  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    throw createError({
      status: 400,
      statusText: 'Validation Error',
      data: {
        issues: parsed.error.issues.map(iss => ({
          path: iss.path.join('.'),
          message: iss.message,
          code: iss.code,
        })),
      },
    })
  }
  const body = parsed.data
  const config = useRuntimeConfig(event)
  const kvrConfig = config.kvr as { publicTeamSlug?: string, publicRecipient?: string }
  const teamSlug = kvrConfig.publicTeamSlug || 'kvr'

  // Resolve team by slug
  const db: any = useDB()

  const [team] = await db.select().from(organization).where(eq(organization.slug, teamSlug)).limit(1)
  if (!team) {
    throw createError({ status: 500, statusText: `Team "${teamSlug}" not found. Ensure the app has been bootstrapped with a team.` })
  }

  // Resolve recipient: env override → first default recipient in team's settings → 500
  let recipientEmail: string | null = kvrConfig.publicRecipient || null
  if (!recipientEmail) {
    const [settingsRow] = await db.select().from(kvrSettings)
      .where(eq(kvrSettings.teamId, team.id))
      .limit(1)
    const recipients = (settingsRow?.recipients as any[]) || []
    const def = recipients.find((r: any) => r?.isDefault) || recipients[0]
    if (def?.email) recipientEmail = def.email
  }
  if (!recipientEmail) {
    throw createError({
      status: 500,
      statusText: 'No recipient configured. Set NUXT_KVR_PUBLIC_RECIPIENT or add a default recipient in /admin/kvr settings.',
    })
  }

  // Find a user to use as owner/createdBy/updatedBy (team's owner, or first admin).
  const [anyMember] = await db.select().from(member)
    .where(and(eq(member.organizationId, team.id), eq(member.role, 'owner')))
    .limit(1)
  const systemUserId = anyMember?.userId || team.ownerId
  if (!systemUserId) {
    throw createError({ status: 500, statusText: `Team "${teamSlug}" has no owner; cannot record public submission.` })
  }

  // Strip the token from the body before insert
  const { token, ...insertData } = body as any

  const record = await createKvrWerkvergunningen({
    ...insertData,
    recipientEmail,
    teamId: team.id,
    owner: systemUserId,
    createdBy: systemUserId,
    updatedBy: systemUserId,
    emailStatus: 'pending',
  })

  const emailResult = await sendWerkvergunningEmail(record as any, event)

  try {
    await updateKvrWerkvergunningen(
      record.id,
      team.id,
      systemUserId,
      { emailStatus: emailResult.status },
      { role: 'owner' },
    )
  }
  catch (err) {
    console.error('[kvr] Public submit — failed to update emailStatus:', err)
  }

  return {
    id: record.id,
    recipientEmail,
    emailStatus: emailResult.status,
    emailError: emailResult.error,
  }
})
