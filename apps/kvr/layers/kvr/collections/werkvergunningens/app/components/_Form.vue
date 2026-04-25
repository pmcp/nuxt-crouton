<script setup lang="ts">
import type { KvrWerkvergunningenFormProps, KvrWerkvergunningenFormData } from '../../types'
import useKvrWerkvergunningens from '../composables/useKvrWerkvergunningens'

// Client-only PDF generator (dynamically imported below to avoid SSR issues)
const pdfAreaEl = ref<HTMLElement | null>(null)

const props = defineProps<KvrWerkvergunningenFormProps>()
const { defaultValue, schema, collection } = useKvrWerkvergunningens()

const { create, update, deleteItems } = useCollectionMutation(collection)
const { close, loading } = useCrouton()
const toast = useToast()

const resending = ref(false)
async function handleResend() {
  if (!state.value.id) return
  const teamId = getTeamId()
  if (!teamId) {
    toast.add({ title: 'Geen team context', color: 'error' })
    return
  }
  resending.value = true
  try {
    const r = await $fetch<{ emailStatus: 'sent' | 'failed', emailError?: string, recipientEmail: string }>(
      `/api/teams/${teamId}/kvr-werkvergunningens/${state.value.id}/resend`,
      { method: 'POST' }
    )
    if (r.emailStatus === 'sent') {
      toast.add({
        title: 'Mail opnieuw verstuurd',
        description: `Naar ${r.recipientEmail}`,
        color: 'success',
        icon: 'i-lucide-mail-check',
      })
      ;(state.value as any).emailStatus = 'sent'
    }
    else {
      toast.add({
        title: 'Opnieuw versturen mislukt',
        description: r.emailError ? `Resend: ${r.emailError}` : 'Zie serverlogs voor details.',
        color: 'warning',
        icon: 'i-lucide-mail-warning',
        duration: 10000,
      })
      ;(state.value as any).emailStatus = 'failed'
    }
  }
  catch (err: any) {
    toast.add({
      title: 'Opnieuw versturen mislukt',
      description: err?.data?.statusMessage || err?.message || 'Onbekende fout',
      color: 'error',
    })
  }
  finally {
    resending.value = false
  }
}

const initialValues = props.action === 'update' && props.activeItem?.id
  ? { ...defaultValue, ...props.activeItem }
  : { ...defaultValue }

if (props.action === 'update' && props.activeItem?.id) {
  if (initialValues.datum) initialValues.datum = new Date(initialValues.datum)
  if (initialValues.opgemaaktOp) initialValues.opgemaaktOp = new Date(initialValues.opgemaaktOp)
}

const state = ref<KvrWerkvergunningenFormData & { id?: string | null }>(initialValues)

// ---- Validation errors ----
interface ValidationError { name?: string, path?: string, message: string }
const validationErrors = ref<ValidationError[]>([])

const fieldLabels: Record<string, string> = {
  sblNumber: 'Nummer SBL',
  datum: 'Datum',
  workType: 'Uit te voeren werk',
  straat: 'Straat',
  huisnummer: 'Nr.',
  postcode: 'Postcode',
  gemeente: 'Gemeente',
  recipientEmail: 'Versturen naar',
}

const errorList = computed(() => validationErrors.value.map((e) => {
  const name = (e.path || e.name || '').split('.').pop() || ''
  return { name, label: fieldLabels[name] ?? name, message: e.message }
}))

function handleValidationError(event: any) {
  validationErrors.value = Array.isArray(event?.errors) ? event.errors : []
}

// Autofill straat / huisnummer / postcode / gemeente from a reverse-geocoded
// location result (CroutonMapsCurrentLocationButton). Mapbox's `place_name`
// puts "Street 12, 1000 City, Country" together — the first segment usually
// holds the street and number; we split the trailing digits off as huisnummer.
function applyGeocodeResult(r: { coordinates: [number, number], address: string, context?: { postcode?: string, place?: string } }) {
  state.value.lng = r.coordinates[0]
  state.value.lat = r.coordinates[1]

  if (r.context?.postcode) state.value.postcode = r.context.postcode
  if (r.context?.place) state.value.gemeente = r.context.place

  const firstSegment = r.address.split(',')[0]?.trim() ?? ''
  const numberMatch = firstSegment.match(/\s+(\d+\w*)$/)
  if (numberMatch?.[1]) {
    state.value.huisnummer = numberMatch[1]
    state.value.straat = firstSegment.slice(0, numberMatch.index).trim()
  }
  else if (firstSegment) {
    state.value.straat = firstSegment
  }
}

// Load recipients from the team settings for the datalist dropdown.
const { getTeamId } = useTeamContext()
interface RecipientOption { label?: string, email: string, isDefault?: boolean }
const { data: settingsData } = useFetch<Array<{ recipients?: RecipientOption[] }>>(
  () => {
    const tid = getTeamId()
    return tid ? `/api/teams/${tid}/kvr-settings` : ''
  },
  { server: false, default: () => [] }
)
const recipientOptions = computed<RecipientOption[]>(() => {
  const rows = settingsData.value ?? []
  const first = rows[0]
  return (first?.recipients ?? []).filter(r => r && r.email)
})

// If nothing is set yet and there's a default recipient in settings, pre-select it.
watchEffect(() => {
  if (!state.value.recipientEmail && recipientOptions.value.length > 0) {
    const preferred = recipientOptions.value.find(r => r.isDefault) ?? recipientOptions.value[0]
    if (preferred) state.value.recipientEmail = preferred.email
  }
})

// Always show exactly 4 cable rows by default (paper form has 4 rows)
if (!state.value.cables || state.value.cables.length === 0) {
  state.value.cables = Array.from({ length: 4 }, () => ({
    id: crypto.randomUUID(),
    van: '',
    naar: '',
    buitenSpanningGeaard: false,
    losgekoppeld: false,
    sleufGeidentificeerd: false,
  }))
}

function addCable() {
  state.value.cables = [
    ...(state.value.cables ?? []),
    {
      id: crypto.randomUUID(),
      van: '',
      naar: '',
      buitenSpanningGeaard: false,
      losgekoppeld: false,
      sleufGeidentificeerd: false,
    },
  ]
}

// ---- Date helpers (for native <input type="date" / datetime-local>) ----
function toDateStr(v: unknown): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v as string)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}
function toDateTimeLocalStr(v: unknown): string {
  if (!v) return ''
  const d = v instanceof Date ? v : new Date(v as string)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const datumStr = computed({
  get: () => toDateStr(state.value.datum),
  set: (v: string) => { (state.value as any).datum = v ? new Date(v) : null },
})
const opgemaaktStr = computed({
  get: () => toDateTimeLocalStr(state.value.opgemaaktOp),
  set: (v: string) => { (state.value as any).opgemaaktOp = v ? new Date(v) : null },
})

async function generateAndUploadPdf(): Promise<string | null> {
  if (!import.meta.client) return null
  const el = pdfAreaEl.value
  if (!el) return null
  try {
    const html2canvas = (await import('html2canvas-pro')).default
    const { jsPDF } = await import('jspdf')

    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (doc: Document, clonedEl: HTMLElement) => {
        // Strip interactive UI chrome from the cloned DOM before rasterising.
        // Hide anything marked data-pdf-hide (photos section, buttons, datalists).
        clonedEl.querySelectorAll('button, [data-pdf-hide], datalist').forEach((n) => {
          (n as HTMLElement).style.display = 'none'
        })

        // Replace text-like inputs/textareas with plain divs so the value sits
        // on top of (not through) the underline, matching the paper form's look.
        const replaceInputWithText = (input: HTMLInputElement | HTMLTextAreaElement) => {
          const value = input.value || ''
          const div = doc.createElement('div')
          div.textContent = value
          div.style.cssText = `
            min-height: 18px;
            padding: 2px 4px 4px;
            border-bottom: 1px solid #888;
            font-size: 11px;
            line-height: 1.35;
            color: #111;
            white-space: pre-wrap;
            word-break: break-word;
          `
          // Preserve the original element's width/flex behavior by copying its class list
          // (Tailwind width/sizing classes still apply).
          div.className = input.className
          input.parentElement?.replaceChild(div, input)
        }
        clonedEl.querySelectorAll<HTMLInputElement>(
          'input[type="text"], input[type="email"], input[type="number"]'
        ).forEach(replaceInputWithText)
        clonedEl.querySelectorAll<HTMLTextAreaElement>('textarea').forEach(replaceInputWithText)

        // Tighten spacing so the form fits on a single A4 page.
        const compactStyle = doc.createElement('style')
        compactStyle.textContent = `
          .pdf-tight { font-size: 11px; }
          .pdf-tight .pt-5 { padding-top: 8px !important; }
          .pdf-tight .pl-5 { padding-left: 10px !important; }
          .pdf-tight .pr-5 { padding-right: 10px !important; }
          .pdf-tight .px-5 { padding-left: 10px !important; padding-right: 10px !important; }
          .pdf-tight .px-4 { padding-left: 8px !important; padding-right: 8px !important; }
          .pdf-tight .py-3 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .pdf-tight .py-2 { padding-top: 3px !important; padding-bottom: 3px !important; }
          .pdf-tight .py-1\\.5 { padding-top: 3px !important; padding-bottom: 3px !important; }
          .pdf-tight .py-1 { padding-top: 2px !important; padding-bottom: 2px !important; }
          .pdf-tight .pb-3 { padding-bottom: 4px !important; }
          .pdf-tight .pb-4 { padding-bottom: 4px !important; }
          .pdf-tight .pt-1 { padding-top: 2px !important; }
          .pdf-tight .p-3 { padding: 6px !important; }
          .pdf-tight .mt-1 { margin-top: 2px !important; }
          .pdf-tight .mt-2 { margin-top: 4px !important; }
          .pdf-tight .mt-3 { margin-top: 6px !important; }
          .pdf-tight .mb-2 { margin-bottom: 3px !important; }
          .pdf-tight .mb-3 { margin-bottom: 4px !important; }
          .pdf-tight .gap-y-2 { row-gap: 4px !important; }
          .pdf-tight .gap-6 { gap: 12px !important; }
          .pdf-tight .space-y-2 > * + *,
          .pdf-tight .space-y-1\\.5 > * + *,
          .pdf-tight .space-y-1 > * + * { margin-top: 3px !important; }
          .pdf-tight canvas { height: 56px !important; }
          .pdf-tight .h-8 { height: 22px !important; }
          .pdf-tight .h-\\[100px\\] { height: 56px !important; }
          /* Paper form uses underlines, not boxes — strip borders + bg in PDF and use a single bottom line */
          .pdf-tight input[type="text"],
          .pdf-tight input[type="email"],
          .pdf-tight input[type="date"],
          .pdf-tight input[type="datetime-local"],
          .pdf-tight input[type="number"],
          .pdf-tight textarea {
            background: transparent !important;
            border: 0 !important;
            border-bottom: 1px solid #888 !important;
            border-radius: 0 !important;
            font-size: 11px !important;
            line-height: 20px !important;
            padding: 0 4px !important;
            color: #111 !important;
          }
          .pdf-tight textarea { min-height: 22px !important; line-height: 1.35 !important; padding: 2px 4px !important; }
          /* Cable row underlines sit flush with the row — strip extra bottom border from wrapping divs */
          .pdf-tight .divide-y > * { border-top: 0 !important; }
          /* Keep the Opgemaakt row on one line (Plaats + Datum & uur label + datetime input) */
          .pdf-tight [data-opgemaakt-row] { flex-wrap: nowrap !important; gap: 8px !important; }
          .pdf-tight [data-opgemaakt-row] > input[type="text"] { flex: 1 1 auto !important; min-width: 80px !important; }
          .pdf-tight [data-opgemaakt-row] > input[type="datetime-local"] { width: 150px !important; }
          .pdf-tight ul { margin: 2px 0 !important; }
          .pdf-tight li { margin: 1px 0 !important; line-height: 1.25 !important; }
        `
        doc.head.appendChild(compactStyle)
        clonedEl.classList.add('pdf-tight')

        // Format date / datetime-local input values into the same kind of
        // "text-on-underline" div we use for the other fields.
        const replaceDateInput = (input: HTMLInputElement, formatted: string) => {
          const div = doc.createElement('div')
          div.textContent = formatted
          div.style.cssText = `
            min-height: 18px;
            padding: 2px 4px 4px;
            border-bottom: 1px solid #888;
            font-size: 11px;
            line-height: 1.35;
            color: #111;
          `
          div.className = input.className
          input.parentElement?.replaceChild(div, input)
        }

        const opgemaaktIso = (state.value.opgemaaktOp instanceof Date
          ? state.value.opgemaaktOp
          : state.value.opgemaaktOp ? new Date(state.value.opgemaaktOp as any) : null)
        clonedEl.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]').forEach((input) => {
          const formatted = opgemaaktIso
            ? opgemaaktIso.toLocaleString('nl-BE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })
            : ''
          replaceDateInput(input, formatted)
        })

        const datum = state.value.datum
          ? (state.value.datum instanceof Date ? state.value.datum : new Date(state.value.datum as any))
          : null
        clonedEl.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach((input) => {
          const formatted = datum
            ? datum.toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })
            : ''
          replaceDateInput(input, formatted)
        })

        // Append a Sibelga-style footer at the bottom so the PDF looks like the official form.
        const footer = doc.createElement('div')
        footer.style.cssText = 'margin-top:12px;padding:8px 12px;border-top:1px solid #bbb;display:flex;justify-content:space-between;align-items:center;font-size:8px;color:#555;'
        footer.innerHTML = `
          <div>
            <div><strong>Sibelga CVBA</strong></div>
            <div>PB 1340 · 1000 Brussel Brouckère · Tel. 02 549 41 00 · Fax 02 549 46 61 · E-mail: klanten@sibelga.be</div>
            <div>RPR Brussel · BTW BE 0222.869.673 · IBAN BE35 7330 1768 3837 · BIC KREDBEBB</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-weight:600;font-size:10px;color:#222">
            <span style="display:inline-block;width:10px;height:10px;border:2.5px solid #c8102e;border-radius:50%"></span>
            <span>Sibelga</span>
          </div>
        `
        clonedEl.appendChild(footer)
      },
    } as any)

    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    // Force single-page A4. If the rendered form is taller than a page at the
    // natural width, shrink width (and thus height) so it all fits.
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const ratio = canvas.width / canvas.height
    let imgW = pageW
    let imgH = pageW / ratio
    if (imgH > pageH) {
      imgH = pageH
      imgW = pageH * ratio
    }
    const offsetX = (pageW - imgW) / 2
    pdf.addImage(imgData, 'JPEG', offsetX, 0, imgW, imgH, undefined, 'FAST')

    const blob = pdf.output('blob')
    const filename = `werkvergunning-${state.value.sblNumber || 'concept'}.pdf`
    const form = new FormData()
    form.append('file', blob, filename)
    const res = await $fetch<{ pathname: string }>('/api/upload-image', {
      method: 'POST',
      body: form,
    })
    return res.pathname
  }
  catch (err) {
    console.error('[kvr] PDF generation/upload failed:', err)
    return null
  }
}

const handleSubmit = async () => {
  validationErrors.value = []
  try {
    // Generate the PDF snapshot of the rendered form before saving, so Kevin's email
    // attachment matches what he sees on screen (photos + signatures baked in).
    const pdfPath = await generateAndUploadPdf()

    const payload: any = { ...state.value }
    if (pdfPath) payload.formPdfPath = pdfPath
    if (payload.datum instanceof Date) payload.datum = payload.datum.toISOString()
    if (payload.opgemaaktOp instanceof Date) payload.opgemaaktOp = payload.opgemaaktOp.toISOString()

    let result: any
    if (props.action === 'create') {
      result = await create(payload)
    }
    else if (props.action === 'update' && state.value.id) {
      result = await update(state.value.id, payload)
    }
    else if (props.action === 'delete') {
      await deleteItems(props.items)
    }

    // Report email dispatch status inline so the user doesn't have to tail the terminal.
    if ((props.action === 'create' || props.action === 'update') && result) {
      const emailStatus = (result as any)?.emailStatus
      const emailError = (result as any)?.emailError
      const recipient = (result as any)?.recipientEmail || state.value.recipientEmail
      const titlePrefix = props.action === 'create' ? 'Werkvergunning opgeslagen' : 'Werkvergunning bijgewerkt'
      if (emailStatus === 'sent') {
        toast.add({
          title: titlePrefix,
          description: `Mail verstuurd naar ${recipient}`,
          color: 'success',
          icon: 'i-lucide-mail-check',
        })
      }
      else if (emailStatus === 'failed') {
        toast.add({
          title: `${titlePrefix}, maar e-mail faalde`,
          description: emailError ? `Resend: ${emailError}` : 'Controleer de Resend API-key en het from-adres.',
          color: 'warning',
          icon: 'i-lucide-mail-warning',
          duration: 10000,
        })
      }
      else {
        toast.add({
          title: titlePrefix,
          color: 'success',
        })
      }
    }

    close()
  }
  catch (error: any) {
    console.error('Form submission failed:', error)
    // Surface server-side errors so the user sees why it failed.
    const data = error?.data
    const issues = data?.data?.issues ?? data?.issues
    if (Array.isArray(issues) && issues.length > 0) {
      validationErrors.value = issues.map((iss: any) => ({
        path: Array.isArray(iss.path) ? iss.path.join('.') : String(iss.path ?? ''),
        message: iss.message ?? 'Invalid value',
      }))
    }
    else {
      validationErrors.value = [{ message: data?.message || data?.statusMessage || error?.message || 'Onbekende fout' }]
    }
    toast.add({
      title: 'Opslaan mislukt',
      description: validationErrors.value[0]?.message,
      color: 'error',
      icon: 'i-lucide-triangle-alert',
    })
  }
}
</script>

<template>
  <CroutonFormActionButton
    v-if="action === 'delete'"
    :action="action"
    :collection="collection"
    :items="items"
    :loading="loading"
    @click="handleSubmit"
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    class="wvg-form mx-auto max-w-4xl bg-white text-neutral-900 shadow-sm"
    @submit="handleSubmit"
    @error="handleValidationError"
  >
    <div ref="pdfAreaEl">
    <!-- Title bar -->
    <div class="pt-5 pl-5">
      <div class="inline-block rounded-tr-2xl bg-[#5b1f4a] px-4 py-2 text-base font-semibold text-white">
        Werkvergunning voor kabelwerken (WVG)
      </div>
    </div>

    <!-- Meta row: Datum + SBL + Nr. 077 -->
    <div class="flex items-center gap-8 px-5 py-3 text-sm">
      <label class="flex items-center gap-2">
        <span class="text-neutral-700">Datum</span>
        <input
          v-model="datumStr"
          type="date"
          class="wvg-input h-8 w-36 px-2"
        >
      </label>
      <label class="flex items-center gap-2">
        <span class="text-neutral-700">Nummer SBL</span>
        <input
          v-model="state.sblNumber"
          type="text"
          maxlength="10"
          class="wvg-input h-8 w-32 px-2 tracking-widest text-center"
          placeholder="SBL"
        >
      </label>
      <div class="ml-auto text-[#5b1f4a] font-bold">
        Nr.&nbsp;<span class="text-xl">077</span>
      </div>
    </div>

    <!-- Section A -->
    <div class="mx-5 mt-2 rounded-tr-2xl bg-[#5b1f4a] px-3 py-1.5 text-sm font-semibold text-white">
      A. UIT TE VOEREN WERK
    </div>
    <div class="px-5 py-3">
      <div class="flex gap-10">
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input v-model="state.workType" type="radio" value="laagspanningslas" class="size-4 accent-[#5b1f4a]">
          <span class="text-neutral-800">Laagspanningslas</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input v-model="state.workType" type="radio" value="hoogspanningslas" class="size-4 accent-[#5b1f4a]">
          <span class="text-neutral-800">Hoogspanningslas</span>
        </label>
      </div>
    </div>

    <!-- Section B -->
    <div class="mx-5 mt-1 rounded-tr-2xl bg-[#5b1f4a] px-3 py-1.5 text-sm font-semibold text-white">
      B. CONSIGNATIE
    </div>

    <!-- B1 Cables -->
    <div class="mx-5 mt-1 bg-[#7a3668] px-3 py-1 text-xs font-semibold text-white">
      B1. BUITENGEBRUIKSTELLING VAN DE INSTALLATIE
    </div>
    <div class="px-5 py-3">
      <!-- Column header -->
      <div class="grid grid-cols-[80px_1fr_1fr_130px_130px_110px] items-end gap-2 pb-1 border-b border-neutral-300 text-[10px]">
        <div />
        <div class="text-center text-neutral-700">Van<sup>1</sup></div>
        <div class="text-center text-neutral-700">Naar<sup>2</sup></div>
        <div class="rounded-sm bg-[#5a8b5c] px-2 py-1 text-center text-white leading-tight">Buiten spanning<br>en geaard</div>
        <div class="rounded-sm bg-[#d97a3c] px-2 py-1 text-center text-white leading-tight">Losgekoppeld<br>niet geaard</div>
        <div class="text-center text-neutral-700 leading-tight">In de sleuf<br>geïdentificeerd</div>
      </div>
      <!-- Rows -->
      <div class="divide-y divide-neutral-200">
        <div
          v-for="(cable, i) in state.cables"
          :key="cable.id"
          class="grid grid-cols-[80px_1fr_1fr_130px_130px_110px] items-center gap-2 py-1.5"
        >
          <div class="pl-1 text-xs font-semibold text-neutral-800">Kabel {{ i + 1 }}</div>
          <input v-model="cable.van" type="text" class="wvg-input h-8 px-2">
          <input v-model="cable.naar" type="text" class="wvg-input h-8 px-2">
          <div class="flex justify-center">
            <input v-model="cable.buitenSpanningGeaard" type="checkbox" class="size-4 accent-[#5b1f4a]">
          </div>
          <div class="flex justify-center">
            <input v-model="cable.losgekoppeld" type="checkbox" class="size-4 accent-[#5b1f4a]">
          </div>
          <div class="flex justify-center">
            <input v-model="cable.sleufGeidentificeerd" type="checkbox" class="size-4 accent-[#5b1f4a]">
          </div>
        </div>
      </div>
      <div class="pt-1 text-[10px] text-neutral-500">
        <sup>1</sup> referentienummer van de verdeeldoos of cabine van vertrek.&nbsp;&nbsp;
        <sup>2</sup> referentienummer van de verdeeldoos of cabine van aankomst.
      </div>
      <button
        type="button"
        class="mt-2 inline-flex items-center gap-1 rounded-sm bg-neutral-800 px-3 py-1 text-xs text-white hover:bg-neutral-700"
        @click="addCable"
      >
        <UIcon name="i-lucide-plus" class="size-3" />
        Kabel toevoegen
      </button>
    </div>

    <!-- B2 Address -->
    <div class="mx-5 mt-1 bg-[#7a3668] px-3 py-1 text-xs font-semibold text-white">
      B2. ADRES VAN DE WERKZONE
    </div>
    <div class="px-5 py-3 space-y-2">
      <div class="flex justify-end" data-pdf-hide>
        <CroutonMapsCurrentLocationButton
          label="Gebruik mijn locatie"
          icon="i-lucide-map-pin"
          color="neutral"
          variant="outline"
          size="xs"
          @located="applyGeocodeResult"
        />
      </div>
      <div class="grid grid-cols-[1fr_140px] gap-4">
        <label class="block text-sm">
          <span class="block text-xs text-neutral-600 mb-0.5">Straat</span>
          <input v-model="state.straat" type="text" class="wvg-input h-8 w-full px-2">
        </label>
        <label class="block text-sm">
          <span class="block text-xs text-neutral-600 mb-0.5">Nr.</span>
          <input v-model="state.huisnummer" type="text" class="wvg-input h-8 w-full px-2">
        </label>
      </div>
      <div class="grid grid-cols-[200px_1fr] gap-4">
        <label class="block text-sm">
          <span class="block text-xs text-neutral-600 mb-0.5">Postcode</span>
          <input v-model="state.postcode" type="text" inputmode="numeric" maxlength="4" class="wvg-input h-8 w-full px-2">
        </label>
        <label class="block text-sm">
          <span class="block text-xs text-neutral-600 mb-0.5">Gemeente</span>
          <input v-model="state.gemeente" type="text" class="wvg-input h-8 w-full px-2">
        </label>
      </div>
    </div>

    <!-- B3 -->
    <div class="mx-5 mt-1 bg-[#7a3668] px-3 py-1 text-xs font-semibold text-white">
      B3. ANDERE INSTALLATIES
    </div>
    <div class="px-5 py-2 text-sm text-neutral-700">
      Alle andere kabels in de sleuf, buiten de hierboven genoemde, moeten beschouwd worden als onder spanning.
    </div>

    <!-- Section C -->
    <div class="mx-5 mt-2 rounded-tr-2xl bg-[#5b1f4a] px-3 py-1.5 text-sm font-semibold text-white">
      C. BEGIN VAN DE WERKEN
    </div>
    <div class="px-5 py-3 space-y-2 text-sm text-neutral-800">
      <p>De schakelbevoegde van Sibelga geeft eerst toestemming om de werken, beschreven in A, aan te vatten.</p>
      <p>De werkverantwoordelijke verklaart voor het begin van de werken dat :</p>
      <div class="rounded-sm border-2 border-[#d97a3c] p-3 space-y-1">
        <ul class="list-disc pl-5 space-y-1">
          <li>hij volledig is ingelicht over de werkzone en over de kabels waaraan het werk moet worden verricht ;</li>
          <li>hij in geval van twijfel de werken zal stopzetten en contact zal opnemen met de schakelbevoegde van Sibelga ;</li>
          <li>
            hij alle nodige instructies zal overmaken aan de personen die werken onder zijn verantwoordelijkheid. De ploeg die het werk verricht is samengesteld uit de volgende personen:
            <textarea
              v-model="state.ploegLeden"
              rows="2"
              class="wvg-input mt-1 block w-full px-2 py-1 text-sm"
            />
          </li>
        </ul>
      </div>
    </div>

    <!-- Opgemaakt row -->
    <div class="px-5 pb-3 flex flex-wrap items-center gap-3 text-sm" data-opgemaakt-row>
      <span class="text-neutral-700 whitespace-nowrap">Opgemaakt in 2 exemplaren te</span>
      <input v-model="state.plaats" type="text" class="wvg-input h-8 flex-1 min-w-[140px] px-2">
      <span class="text-neutral-700 whitespace-nowrap">Datum & uur</span>
      <input v-model="opgemaaktStr" type="datetime-local" class="wvg-input h-8 w-52 px-2">
    </div>

    <!-- Signatures: flat 2-col grid so Handtekening aligns across both columns -->
    <div class="px-5 pb-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <div class="border-b border-neutral-300 pb-1 font-semibold text-neutral-800">De werkverantwoordelijke</div>
      <div class="border-b border-neutral-300 pb-1 font-semibold text-neutral-800">De schakelbevoegde van Sibelga</div>

      <label class="block"><span class="block text-xs text-neutral-600">Naam</span><input v-model="state.werkverantwoordelijkeNaam" type="text" class="wvg-input h-8 w-full px-2"></label>
      <label class="block"><span class="block text-xs text-neutral-600">Naam</span><input v-model="state.schakelbevoegdeNaam" type="text" class="wvg-input h-8 w-full px-2"></label>

      <label class="block"><span class="block text-xs text-neutral-600">Voornaam</span><input v-model="state.werkverantwoordelijkeVoornaam" type="text" class="wvg-input h-8 w-full px-2"></label>
      <label class="block"><span class="block text-xs text-neutral-600">Voornaam</span><input v-model="state.schakelbevoegdeVoornaam" type="text" class="wvg-input h-8 w-full px-2"></label>

      <label class="block"><span class="block text-xs text-neutral-600">Hoedanigheid</span><input v-model="state.werkverantwoordelijkeHoedanigheid" type="text" class="wvg-input h-8 w-full px-2"></label>
      <div aria-hidden="true"></div>

      <label class="block"><span class="block text-xs text-neutral-600">De aannemer</span><input v-model="state.werkverantwoordelijkeAannemer" type="text" class="wvg-input h-8 w-full px-2"></label>
      <div aria-hidden="true"></div>

      <div>
        <span class="block text-xs text-neutral-600">Handtekening</span>
        <SignaturePad v-model="state.werkverantwoordelijkeHandtekening" />
      </div>
      <div>
        <span class="block text-xs text-neutral-600">Handtekening</span>
        <SignaturePad v-model="state.schakelbevoegdeHandtekening" />
      </div>
    </div>

    <!-- Photos — hidden in the PDF snapshot (data-pdf-hide); included as email attachments -->
    <div data-pdf-hide>
      <div class="mx-5 mt-1 bg-[#7a3668] px-3 py-1 text-xs font-semibold text-white">
        FOTO'S
      </div>
      <div class="px-5 py-3">
        <CroutonFormRepeater
          :model-value="state.photos ?? []"
          component-name="KvrWerkvergunningensPhotoInput"
          add-label="Foto toevoegen"
          :sortable="true"
          @update:model-value="(v: any) => (state.photos = v)"
        />
      </div>
    </div>

    </div> <!-- /pdfAreaEl -->

    <!-- Validation errors -->
    <div v-if="errorList.length" class="mx-5 mt-2 rounded-sm border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      <div class="mb-1 font-semibold">Vul de volgende velden in:</div>
      <ul class="list-disc pl-5 space-y-0.5">
        <li v-for="(e, i) in errorList" :key="i">
          <strong>{{ e.label }}:</strong> {{ e.message }}
        </li>
      </ul>
    </div>

    <!-- Submit -->
    <div class="mt-2 flex items-end justify-between gap-6 border-t border-neutral-200 bg-neutral-50 px-5 py-4">
      <label class="block flex-1 max-w-xs text-sm">
        <span class="block text-xs text-neutral-600 mb-0.5">
          Versturen naar
          <span
            v-if="action === 'update' && (state as any).emailStatus"
            :class="[
              'ml-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
              (state as any).emailStatus === 'sent' && 'bg-green-100 text-green-700',
              (state as any).emailStatus === 'failed' && 'bg-amber-100 text-amber-700',
              (state as any).emailStatus === 'pending' && 'bg-neutral-200 text-neutral-600',
            ]"
          >{{ (state as any).emailStatus }}</span>
        </span>
        <input
          v-model="state.recipientEmail"
          type="email"
          list="kvr-recipient-options"
          class="wvg-input h-8 w-full px-2"
          placeholder="naam@voorbeeld.be"
          required
        >
        <datalist id="kvr-recipient-options">
          <option
            v-for="r in recipientOptions"
            :key="r.email"
            :value="r.email"
          >{{ r.label || r.email }}</option>
        </datalist>
      </label>
      <div class="flex items-center gap-3">
        <UButton
          v-if="action === 'update' && state.id"
          :loading="resending"
          icon="i-lucide-mail"
          color="neutral"
          variant="outline"
          type="button"
          @click="handleResend"
        >
          Mail opnieuw versturen
        </UButton>
        <CroutonFormActionButton
          :action="action"
          :collection="collection"
          :items="items"
          :loading="loading"
        />
      </div>
    </div>
  </UForm>
</template>

<style scoped>
.wvg-form :deep(input[type="text"]),
.wvg-form :deep(input[type="date"]),
.wvg-form :deep(input[type="datetime-local"]),
.wvg-form :deep(input[type="number"]),
.wvg-form :deep(textarea),
.wvg-input {
  background-color: #fffdf5;
  color: #111;
  border: 1px solid #d0c8b8;
  border-radius: 2px;
  outline: none;
}

.wvg-form :deep(input:focus),
.wvg-form :deep(textarea:focus),
.wvg-input:focus {
  background-color: #fff5cc;
  border-color: #5b1f4a;
}
</style>
