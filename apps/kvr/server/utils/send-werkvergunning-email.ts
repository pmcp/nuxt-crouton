import type { H3Event } from 'h3'
import { Resend } from 'resend'
import { blob } from 'hub:blob'

interface CableRow {
  van?: string
  naar?: string
  buitenSpanningGeaard?: boolean
  losgekoppeld?: boolean
  sleufGeidentificeerd?: boolean
}

interface PhotoRow {
  assetId?: string
  caption?: string
}

export interface WerkvergunningRecord {
  id: string
  sblNumber: string
  datum: Date | string | null
  workType: string
  cables?: CableRow[] | null
  straat: string
  huisnummer: string
  postcode: string
  gemeente: string
  ploegLeden?: string | null
  plaats?: string | null
  opgemaaktOp?: Date | string | null
  werkverantwoordelijkeNaam?: string | null
  werkverantwoordelijkeVoornaam?: string | null
  werkverantwoordelijkeHoedanigheid?: string | null
  werkverantwoordelijkeAannemer?: string | null
  werkverantwoordelijkeHandtekening?: string | null
  schakelbevoegdeNaam?: string | null
  schakelbevoegdeVoornaam?: string | null
  schakelbevoegdeHandtekening?: string | null
  photos?: PhotoRow[] | null
  recipientEmail: string
  formPdfPath?: string | null
}

function esc(v: unknown) {
  const s = v == null ? '' : String(v)
  return s.replace(/[&<>"']/g, c => (
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  ))
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return '—'
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('nl-BE', { dateStyle: 'short', timeStyle: 'short' })
}

function renderHtml(r: WerkvergunningRecord) {
  const cableRows = (r.cables ?? []).map((c, i) => `
    <tr>
      <td style="padding:6px 8px;border:1px solid #ccc;font-weight:600;background:#fafafa">Kabel ${i + 1}</td>
      <td style="padding:6px 8px;border:1px solid #ccc">${esc(c.van)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc">${esc(c.naar)}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${c.buitenSpanningGeaard ? 'Ja' : 'Neen'}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${c.losgekoppeld ? 'Ja' : 'Neen'}</td>
      <td style="padding:6px 8px;border:1px solid #ccc;text-align:center">${c.sleufGeidentificeerd ? 'Ja' : 'Neen'}</td>
    </tr>
  `).join('')

  return `
  <div style="font-family:Arial,sans-serif;color:#111;max-width:720px">
    <h2 style="background:#5b1f4a;color:#fff;padding:8px 12px;border-top-right-radius:16px;display:inline-block">
      Werkvergunning voor kabelwerken (WVG)
    </h2>
    <p><strong>Datum:</strong> ${formatDate(r.datum)} &nbsp;·&nbsp; <strong>SBL:</strong> ${esc(r.sblNumber)}</p>

    <h3 style="background:#5b1f4a;color:#fff;padding:4px 10px;border-top-right-radius:10px">A. Uit te voeren werk</h3>
    <p>${esc(r.workType)}</p>

    <h3 style="background:#5b1f4a;color:#fff;padding:4px 10px;border-top-right-radius:10px">B1. Buitengebruikstelling</h3>
    <table style="border-collapse:collapse;width:100%;font-size:13px">
      <thead>
        <tr>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#f2f2f2"></th>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#f2f2f2">Van</th>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#f2f2f2">Naar</th>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#5a8b5c;color:#fff">Buiten spanning en geaard</th>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#d97a3c;color:#fff">Losgekoppeld niet geaard</th>
          <th style="padding:6px 8px;border:1px solid #ccc;background:#f2f2f2">In de sleuf geïdentificeerd</th>
        </tr>
      </thead>
      <tbody>${cableRows}</tbody>
    </table>

    <h3 style="background:#5b1f4a;color:#fff;padding:4px 10px;border-top-right-radius:10px">B2. Adres werkzone</h3>
    <p>${esc(r.straat)} ${esc(r.huisnummer)}<br>${esc(r.postcode)} ${esc(r.gemeente)}</p>

    <h3 style="background:#5b1f4a;color:#fff;padding:4px 10px;border-top-right-radius:10px">C. Begin van de werken</h3>
    <p><strong>Opgemaakt te:</strong> ${esc(r.plaats)} &nbsp;·&nbsp; ${formatDate(r.opgemaaktOp)}</p>
    <p><strong>Ploeg:</strong><br>${esc(r.ploegLeden).replace(/\n/g, '<br>')}</p>

    <table style="width:100%;font-size:13px;margin-top:8px">
      <tr>
        <td style="vertical-align:top;width:50%;padding-right:8px">
          <strong>De werkverantwoordelijke</strong><br>
          ${esc(r.werkverantwoordelijkeVoornaam)} ${esc(r.werkverantwoordelijkeNaam)}<br>
          ${esc(r.werkverantwoordelijkeHoedanigheid)}<br>
          <em>Aannemer:</em> ${esc(r.werkverantwoordelijkeAannemer)}<br>
          ${r.werkverantwoordelijkeHandtekening ? `<img src="${esc(r.werkverantwoordelijkeHandtekening)}" alt="handtekening" style="max-width:240px;margin-top:6px;border-bottom:1px solid #aaa"/>` : ''}
        </td>
        <td style="vertical-align:top;width:50%;padding-left:8px">
          <strong>De schakelbevoegde van Sibelga</strong><br>
          ${esc(r.schakelbevoegdeVoornaam)} ${esc(r.schakelbevoegdeNaam)}<br>
          ${r.schakelbevoegdeHandtekening ? `<img src="${esc(r.schakelbevoegdeHandtekening)}" alt="handtekening" style="max-width:240px;margin-top:6px;border-bottom:1px solid #aaa"/>` : ''}
        </td>
      </tr>
    </table>

    <p style="color:#666;font-size:11px;margin-top:16px">
      Ref. ${esc(r.id)} — Automatisch gegenereerd door KVR
    </p>
  </div>
  `
}

export async function sendWerkvergunningEmail(record: WerkvergunningRecord, event: H3Event): Promise<{ status: 'sent' | 'failed', error?: string }> {
  // Must pass event — useRuntimeConfig() without it returns the module-init
  // snapshot on CF Workers, which contains build-time defaults instead of
  // per-request env-var overrides. process.env.NUXT_* is the CF-side fallback.
  const config = useRuntimeConfig(event)
  const apiKey = (config.email as any)?.resendApiKey || process.env.NUXT_EMAIL_RESEND_API_KEY
  const from = (config.email as any)?.fromAddress || process.env.NUXT_EMAIL_FROM_ADDRESS || 'no-reply@kvr.local'

  if (!apiKey) {
    console.error('[kvr] Resend API key not configured')
    return { status: 'failed', error: 'resend-api-key-missing' }
  }
  if (!record.recipientEmail) {
    return { status: 'failed', error: 'no-recipient' }
  }

  // Gather attachments: first the rendered form PDF (if any), then photos
  const attachments: { filename: string, content: Buffer }[] = []

  if (record.formPdfPath) {
    try {
      const b = await blob.get(record.formPdfPath)
      if (b) {
        const buf = Buffer.from(await b.arrayBuffer())
        attachments.push({
          filename: `werkvergunning-${record.sblNumber || record.id}.pdf`,
          content: buf,
        })
      }
    }
    catch (err) {
      console.error(`[kvr] Failed to attach form PDF ${record.formPdfPath}:`, err)
    }
  }

  for (const [i, p] of (record.photos ?? []).entries()) {
    if (!p?.assetId) continue
    try {
      const b = await blob.get(p.assetId)
      if (!b) continue
      const buf = Buffer.from(await b.arrayBuffer())
      const ext = (p.assetId.split('.').pop() || 'jpg').toLowerCase()
      attachments.push({
        filename: `foto-${i + 1}${p.caption ? `-${p.caption.replace(/[^a-z0-9-_]/gi, '_').slice(0, 30)}` : ''}.${ext}`,
        content: buf,
      })
    }
    catch (err) {
      console.error(`[kvr] Failed to attach photo ${p.assetId}:`, err)
    }
  }

  const subject = `WVG ${record.sblNumber} — ${record.straat} ${record.huisnummer}, ${record.gemeente}`
  const html = renderHtml(record)

  const totalBytes = attachments.reduce((sum, a) => sum + a.content.length, 0)
  const keyPrefix = apiKey.slice(0, 6) + '…' + apiKey.slice(-4)
  console.log(`[kvr] Sending email: from=${from} to=${record.recipientEmail} key=${keyPrefix} subject="${subject}" attachments=${attachments.length} (${(totalBytes / 1024 / 1024).toFixed(2)} MB) html=${html.length} chars`)

  try {
    const resend = new Resend(apiKey)
    const response = await resend.emails.send({
      from,
      to: record.recipientEmail,
      subject,
      html,
      attachments,
    })
    if (response.error) {
      // Log the FULL error object — Resend sometimes stuffs details into extra fields.
      console.error('[kvr] Resend error full:', JSON.stringify(response.error, null, 2))
      const extra: string[] = []
      const err: any = response.error
      if (err.name) extra.push(`name=${err.name}`)
      if (err.statusCode) extra.push(`statusCode=${err.statusCode}`)
      return {
        status: 'failed',
        error: `${err.message ?? String(err)}${extra.length ? ` (${extra.join(', ')})` : ''}`,
      }
    }
    console.log('[kvr] Resend accepted, id=', response.data?.id)
    return { status: 'sent' }
  }
  catch (err: any) {
    const msg = err?.message ?? String(err)
    console.error('[kvr] Send exception:', err)
    return { status: 'failed', error: msg }
  }
}
