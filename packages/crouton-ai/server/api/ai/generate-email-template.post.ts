import { generateText } from 'ai'

const triggerDescriptions: Record<string, string> = {
  booking_created: 'Sent immediately when a new booking is made. Tone: welcoming, confirmatory, reassuring.',
  reminder_before: 'Sent as a reminder before the booking date. Tone: helpful, friendly reminder.',
  booking_cancelled: 'Sent when a booking is cancelled. Tone: professional, empathetic, understanding.',
  follow_up_after: 'Sent after the booking has taken place. Tone: grateful, encouraging feedback or return visits.'
}

function buildSystemPrompt(triggerType: string, recipientType: string, locale: string): string {
  const languageName = getLanguageName(locale)
  const triggerDesc = triggerDescriptions[triggerType] || triggerDescriptions.booking_created

  return `You are an email template generator for a booking management system.
Generate a professional, warm email template based on the given context.

## Trigger Type: ${triggerType}
${triggerDesc}

## Recipient: ${recipientType}
${recipientType === 'customer' ? 'The email is sent TO the customer who made the booking.' : ''}${recipientType === 'admin' ? 'The email is sent TO the team administrator about a booking.' : ''}${recipientType === 'both' ? 'The email is sent to both customer and admin. Write from the team perspective addressing the customer.' : ''}

## Available Variables
Use double curly braces syntax exactly as shown. Include relevant variables naturally in the content.

- {{customer_name}} — Customer's full name
- {{customer_email}} — Customer's email address
- {{booking_date}} — Formatted booking date (e.g., "Friday, January 24, 2025")
- {{booking_slot}} — Time slot (e.g., "14:00 - 15:00")
- {{booking_reference}} — Unique booking reference number
- {{location_name}} — Location name
- {{location_title}} — Location title
- {{location_address}} — Full address
- {{team_name}} — Team/business name
- {{team_email}} — Team contact email
- {{team_phone}} — Team contact phone

## Language
Write ALL content in ${languageName}. Do not mix languages.

## Output Format
Return ONLY a valid JSON object — no markdown fences, no explanation:
{
  "name": "Short template name (2-4 words, e.g. 'Booking Confirmation')",
  "subject": "Email subject line using variables where appropriate (max 80 chars)",
  "body": "<p>HTML body content</p>"
}

## Body Rules
- Use simple HTML only: <p>, <strong>, <br>, <ul>, <li>
- Include relevant variables naturally in the text
- Keep it professional but warm
- 3-5 paragraphs max
- End with a signature line from {{team_name}} with {{team_email}} and/or {{team_phone}}
- Do NOT include <html>, <head>, or <body> wrapper tags — just the inner content`
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const { triggerType, recipientType, locale } = await readBody<{
    triggerType: string
    recipientType: string
    locale: string
  }>(event)

  if (!triggerType || !recipientType || !locale) {
    throw createError({ status: 400, statusText: 'triggerType, recipientType, and locale are required' })
  }

  const ai = createAIProvider(event)
  const modelId = ai.getDefaultModel()

  const { text } = await generateText({
    model: ai.model(modelId),
    system: buildSystemPrompt(triggerType, recipientType, locale),
    messages: [{ role: 'user', content: `Generate an email template for trigger "${triggerType}" sent to "${recipientType}".` }]
  })

  const cleaned = text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)

    if (!parsed.name || !parsed.subject || !parsed.body) {
      throw new Error('Missing required fields')
    }

    return {
      name: parsed.name,
      subject: parsed.subject,
      body: parsed.body
    }
  }
  catch {
    throw createError({
      status: 500,
      statusText: 'Failed to generate email template. Please try again.'
    })
  }
})
