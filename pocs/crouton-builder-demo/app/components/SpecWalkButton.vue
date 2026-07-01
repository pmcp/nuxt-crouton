<script setup lang="ts">
/**
 * SpecWalkButton — the in-app reconcile/verify tour launcher (#1039).
 *
 * Rendered as a plain fixed on-page button in spike-app.vue, RIGHT NEXT TO the v52
 * version chip — the one pattern proven to show on mobile staging (the spike team's
 * own note: Nuxt DevTools / the devtools pill can't be relied on there). Earlier tries
 * failed for real reasons: the app.vue `showChangelogTool` gate is false on a review
 * build, and `useCroutonDevTools().registerTool` doesn't surface in that pill's menu
 * (only the built-in Console/Annotate do). So this owns its own always-visible button.
 *
 * On click it drives driver.js through the spec's `proposed` entries: spotlights each
 * entry's `[data-handoff="<hook>"]` element, shows when→expect + steps, captures
 * ✅/⚠️/➕ per entry (localStorage), ends on an Export step (Copy JSON — same shape as
 * scripts/spec-walklist.mjs) to paste back to the agent (flips proposed→settled).
 */
import { ref, onMounted } from 'vue'
import specData from '~~/spec.json'

type Status = 'settled' | 'stopgap' | 'new' | 'proposed'
interface SpecEntry {
  id: string; behaviour: string; when: string; expect: string; hook: string
  howToTest: string; status: Status; consideredRejected?: string[]
}
type Verdict = 'confirmed' | 'contradicted' | 'undocumented'

const spec = specData as SpecEntry[]
const walk = spec.filter(e => e.status === 'proposed')
const refEntries = spec.filter(e => e.status !== 'proposed')
const STORE = 'specwalk:crouton-builder-demo'

const marked = ref(0)
const busy = ref(false)

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stepsOf = (e: SpecEntry) => (e.howToTest || '').split(/\s(?=\d\.\s)/).map(s => s.replace(/^\d\.\s*/, ''))
const selectorFor = (hook: string) => hook ? `[data-handoff="${hook.split('[')[0]}"]` : ''

function loadState(): Record<string, { verdict?: Verdict; note?: string }> {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}') } catch { return {} }
}
function saveState(s: Record<string, { verdict?: Verdict; note?: string }>) {
  try { localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* ignore */ }
  marked.value = walk.filter(e => s[e.id]?.verdict).length
}
onMounted(() => { marked.value = walk.filter(e => loadState()[e.id]?.verdict).length })

function ensureStyle() {
  if (document.getElementById('sw-style')) return
  const el = document.createElement('style')
  el.id = 'sw-style'
  el.textContent = `
    .sw-body { font-size: 13px; line-height: 1.5; }
    .sw-body .sw-be { margin: 0 0 8px; font-weight: 500; }
    .sw-body .sw-we { background: #0d1117; color: #c9d1d9; border-radius: 6px; padding: 7px 9px; margin-bottom: 8px; }
    .sw-body .sw-we b { color: #8b949e; font-weight: 600; font-size: 11px; text-transform: uppercase; }
    .sw-body ol { margin: 0 0 8px; padding-left: 20px; } .sw-body li { margin: 2px 0; }
    .sw-body .sw-hint { font-size: 12px; color: #b0863b; margin: 0 0 8px; }
    .sw-body code { background: #0d1117; padding: 0 4px; border-radius: 4px; }
    .sw-verdict { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .sw-verdict button { flex: 1; min-width: 92px; padding: 6px; border-radius: 6px; cursor: pointer;
      border: 1px solid #30363d; background: #161b22; color: #e6edf3; font-size: 12px; }
    .sw-verdict button.sw-sel { border-color: #388bfd; background: rgba(56,139,253,.18); }
    .sw-note { width: 100%; min-height: 42px; resize: vertical; font: 12px/1.4 inherit; box-sizing: border-box;
      background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; padding: 6px 8px; }
    .sw-exp { width: 100%; min-height: 150px; box-sizing: border-box; font: 11px/1.4 ui-monospace, monospace;
      background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; padding: 8px; margin: 6px 0; }
    .sw-copy { padding: 7px 14px; border-radius: 6px; border: 1px solid #388bfd; background: #388bfd; color: #fff; cursor: pointer; font-size: 13px; }
  `
  document.head.appendChild(el)
}

function entryDescription(e: SpecEntry, present: boolean) {
  const steps = stepsOf(e).map(s => `<li>${esc(s)}</li>`).join('')
  const hint = e.hook && !present
    ? `<p class="sw-hint">🔖 <code>${esc(e.hook)}</code> — appears during the gesture; do the steps and it lights up.</p>`
    : ''
  return `<div class="sw-body">
    <p class="sw-be">${esc(e.behaviour)}</p>
    <div class="sw-we"><b>When</b> ${esc(e.when)} → <b>Expect</b> ${esc(e.expect)}</div>
    <ol>${steps}</ol>${hint}
    <div class="sw-verdict">
      <button data-v="confirmed">✅ Confirmed</button>
      <button data-v="contradicted">⚠️ Contradicted</button>
      <button data-v="undocumented">➕ Undocumented</button>
    </div>
    <textarea class="sw-note" placeholder="note / delta — what the POC actually does…"></textarea>
  </div>`
}

function exportPayload() {
  const s = loadState()
  return {
    spec: 'crouton-builder-demo',
    verdicts: walk.map(e => ({ id: e.id, status: e.status, verdict: s[e.id]?.verdict || 'skipped', note: s[e.id]?.note || '' })),
    readonly: refEntries.map(e => ({ id: e.id, status: e.status }))
  }
}
function exportDescription() {
  return `<div class="sw-body">
    <p class="sw-be">${marked.value} / ${walk.length} marked. Copy this and paste it back to the agent — confirmed entries flip <code>proposed → settled</code>.</p>
    <textarea class="sw-exp" readonly>${esc(JSON.stringify(exportPayload(), null, 2))}</textarea>
    <button class="sw-copy">Copy JSON</button>
  </div>`
}

async function startWalk() {
  if (busy.value) return
  busy.value = true
  try {
    ensureStyle()
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const steps = walk.map((e) => {
      const sel = selectorFor(e.hook)
      const el = sel ? document.querySelector(sel) : null
      return {
        element: el || undefined,
        popover: el
          ? { title: e.id, description: entryDescription(e, true), side: 'left' as const, align: 'start' as const }
          : { title: e.id, description: entryDescription(e, false) }
      }
    })
    steps.push({ element: undefined, popover: { title: '✅ Export verdicts', description: exportDescription() } })

    const d = driver({
      showProgress: true, allowClose: true,
      nextBtnText: 'Next →', prevBtnText: '← Prev', doneBtnText: 'Done',
      steps,
      onPopoverRender: (popover: { wrapper: HTMLElement }) => {
        const idx = d.getActiveIndex?.() ?? 0
        const e = walk[idx]
        if (e) {
          const cur = loadState()[e.id] || {}
          popover.wrapper.querySelectorAll<HTMLButtonElement>('.sw-verdict button').forEach((b) => {
            if (b.dataset.v === cur.verdict) b.classList.add('sw-sel')
            b.onclick = () => {
              const s = loadState(); s[e.id] = { ...(s[e.id] || {}), verdict: b.dataset.v as Verdict }; saveState(s)
              popover.wrapper.querySelectorAll('.sw-verdict button').forEach(x => x.classList.remove('sw-sel'))
              b.classList.add('sw-sel')
              setTimeout(() => d.moveNext(), 160)
            }
          })
          const note = popover.wrapper.querySelector<HTMLTextAreaElement>('.sw-note')
          if (note) { note.value = cur.note || ''; note.oninput = () => { const s = loadState(); s[e.id] = { ...(s[e.id] || {}), note: note.value }; saveState(s) } }
        } else {
          const ta = popover.wrapper.querySelector<HTMLTextAreaElement>('.sw-exp')
          if (ta) ta.value = JSON.stringify(exportPayload(), null, 2)
          const copy = popover.wrapper.querySelector<HTMLButtonElement>('.sw-copy')
          if (copy) copy.onclick = async () => {
            try { await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2)); copy.textContent = 'Copied ✓' } catch { /* ignore */ }
          }
        }
      },
      onDestroyed: () => { busy.value = false }
    })
    d.drive()
  } catch (err) {
    busy.value = false
    console.error('[SpecWalk] failed to start', err)
  }
}
</script>

<template>
  <!-- Fixed on-page launcher, stacked just above the v52 chip (bottom-1) — the only
       surface proven to show on mobile staging. Ungated on purpose (like the v52 chip). -->
  <UButton
    class="fixed bottom-8 left-1 z-50 font-mono text-[10px]"
    size="xs"
    color="primary"
    variant="soft"
    icon="i-lucide-footprints"
    :label="`Spec walk ${marked}/${walk.length}`"
    :loading="busy"
    @click="startWalk"
  />
</template>
