<script setup lang="ts">
/**
 * SpecWalk — the in-app spec reconcile/verify tour (the #1038 MVP, POC-scoped).
 *
 * Reads this POC's spec.json and walks the `proposed` entries ON the running app:
 * driver.js spotlights each entry's `data-handoff` hook element (so the instruction
 * and the real thing are ONE context), the popover shows when→expect + how-to-test,
 * and you mark ✅/⚠️/➕ per entry. Verdicts persist in localStorage; Export emits the
 * same JSON shape the offline stepper does, to paste back to the agent (flips
 * proposed→settled). The offline `spec-walk.html` stays the out-of-app fallback.
 *
 * Some hooks are gesture-transient (snap-guide fires mid-drag, ghost-pane on an armed
 * drop) — they won't be in the DOM when the step opens, so the step shows a centered
 * popover noting "do the gesture; the 🔖 hook lights up when it fires" instead of a
 * (missing) spotlight. Persistent hooks (page-badge, region-pill, floor-readout) spotlight.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import specData from '~~/spec.json'

type Status = 'settled' | 'stopgap' | 'new' | 'proposed'
interface SpecEntry {
  id: string; behaviour: string; when: string; expect: string; hook: string
  howToTest: string; status: Status; supersedes?: string; consideredRejected?: string[]
}
type Verdict = 'confirmed' | 'contradicted' | 'undocumented'

const spec = specData as SpecEntry[]
const walk = spec.filter(e => e.status === 'proposed')
const ref_ = spec.filter(e => e.status !== 'proposed')

const STORE = 'specwalk:crouton-builder-demo'
const verdicts = reactive<Record<string, { verdict?: Verdict; note?: string }>>({})
const exportOpen = ref(false)
const busy = ref(false)

onMounted(() => {
  try { Object.assign(verdicts, JSON.parse(localStorage.getItem(STORE) || '{}')) } catch { /* fresh */ }
})
const persist = () => { try { localStorage.setItem(STORE, JSON.stringify(verdicts)) } catch { /* ignore */ } }

const markedCount = computed(() => walk.filter(e => verdicts[e.id]?.verdict).length)

const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const stepsOf = (e: SpecEntry) => (e.howToTest || '').split(/\s(?=\d\.\s)/).map(s => s.replace(/^\d\.\s*/, ''))
const selectorFor = (hook: string) => hook ? `[data-handoff="${hook.split('[')[0]}"]` : ''

const exportObj = computed(() => ({
  spec: 'crouton-builder-demo',
  verdicts: walk.map(e => ({
    id: e.id, status: e.status,
    verdict: verdicts[e.id]?.verdict || 'skipped', note: verdicts[e.id]?.note || ''
  })),
  readonly: ref_.map(e => ({ id: e.id, status: e.status }))
}))
const exportText = computed(() => JSON.stringify(exportObj.value, null, 2))

function describe(e: SpecEntry, present: boolean) {
  const steps = stepsOf(e).map(s => `<li>${esc(s)}</li>`).join('')
  const hint = e.hook && !present
    ? `<p class="sw-hint">🔖 <code>${esc(e.hook)}</code> — this state appears during the gesture; do the steps and it lights up when it fires.</p>`
    : ''
  return `
    <div class="sw-body">
      <p class="sw-behaviour">${esc(e.behaviour)}</p>
      <div class="sw-we"><b>When</b> ${esc(e.when)} → <b>Expect</b> ${esc(e.expect)}</div>
      <ol class="sw-steps">${steps}</ol>${hint}
      <div class="sw-verdict" data-id="${esc(e.id)}">
        <button data-v="confirmed">✅ Confirmed</button>
        <button data-v="contradicted">⚠️ Contradicted</button>
        <button data-v="undocumented">➕ Undocumented</button>
      </div>
      <textarea class="sw-note" data-id="${esc(e.id)}" placeholder="note / delta — what the POC actually does…"></textarea>
    </div>`
}

async function startWalk() {
  if (!import.meta.client || busy.value) return
  busy.value = true
  try {
    const { driver } = await import('driver.js')
    await import('driver.js/dist/driver.css')

    const steps = walk.map((e) => {
      const sel = selectorFor(e.hook)
      const el = sel ? document.querySelector(sel) : null
      // With an element → spotlight it (side/align positions the popover); without one
      // (no hook, or a gesture-transient hook not in the DOM yet) → omit side so driver
      // renders a centered modal popover.
      return {
        element: el || undefined,
        popover: el
          ? { title: e.id, description: describe(e, true), side: 'left' as const, align: 'start' as const }
          : { title: e.id, description: describe(e, false) }
      }
    })

    const d = driver({
      showProgress: true,
      allowClose: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Prev',
      doneBtnText: 'Finish',
      steps,
      onPopoverRender: (popover: { wrapper: HTMLElement }) => {
        const idx = d.getActiveIndex?.() ?? 0
        const e = walk[idx]
        if (!e) return
        const cur = verdicts[e.id] || {}
        popover.wrapper.querySelectorAll<HTMLButtonElement>('.sw-verdict button').forEach((b) => {
          if (b.dataset.v === cur.verdict) b.classList.add('sw-sel')
          b.onclick = () => {
            verdicts[e.id] = { ...(verdicts[e.id] || {}), verdict: b.dataset.v as Verdict }
            persist()
            popover.wrapper.querySelectorAll('.sw-verdict button').forEach(x => x.classList.remove('sw-sel'))
            b.classList.add('sw-sel')
            setTimeout(() => { d.moveNext() }, 160)
          }
        })
        const note = popover.wrapper.querySelector<HTMLTextAreaElement>('.sw-note')
        if (note) {
          note.value = cur.note || ''
          note.oninput = () => { verdicts[e.id] = { ...(verdicts[e.id] || {}), note: note.value }; persist() }
        }
      },
      onDestroyed: () => { busy.value = false; exportOpen.value = true }
    })
    d.drive()
  } catch (err) {
    busy.value = false
    console.error('[SpecWalk] failed to start', err)
  }
}

async function copyExport() {
  try { await navigator.clipboard.writeText(exportText.value) } catch { /* ignore */ }
}
</script>

<template>
  <div class="sw-launcher">
    <UButton size="sm" color="primary" icon="i-lucide-footprints" :loading="busy" @click="startWalk">
      Spec walk
      <span class="sw-count">{{ markedCount }}/{{ walk.length }}</span>
    </UButton>
    <UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-download" @click="exportOpen = true">
      Export
    </UButton>
  </div>

  <UModal v-model:open="exportOpen" title="Spec walk — verdicts">
    <template #body>
      <p class="text-sm text-muted mb-3">
        {{ markedCount }} of {{ walk.length }} marked. Paste this back to the agent — confirmed entries
        flip <code>proposed → settled</code>, the rest become spec edits.
      </p>
      <UTextarea :model-value="exportText" :rows="16" readonly class="w-full font-mono text-xs" />
      <div class="flex gap-2 mt-3">
        <UButton color="primary" icon="i-lucide-copy" @click="copyExport">Copy JSON</UButton>
        <UButton color="neutral" variant="ghost" @click="exportOpen = false">Close</UButton>
      </div>
    </template>
  </UModal>
</template>

<style>
/* Launcher — bottom-left, clear of the changelog chip (bottom-right). */
.sw-launcher {
  position: fixed; left: 12px; bottom: 12px; z-index: 60;
  display: flex; gap: 6px; align-items: center;
}
.sw-count {
  margin-left: 6px; font-size: 11px; opacity: .8;
  background: rgba(255, 255, 255, .18); padding: 1px 6px; border-radius: 20px;
}
/* driver.js popover body (plain DOM injected into the popover). */
.sw-body { font-size: 13px; line-height: 1.5; }
.sw-behaviour { margin: 0 0 8px; font-weight: 500; }
.sw-we { background: #0d1117; color: #c9d1d9; border-radius: 6px; padding: 7px 9px; margin-bottom: 8px; }
.sw-we b { color: #8b949e; font-weight: 600; font-size: 11px; text-transform: uppercase; }
.sw-steps { margin: 0 0 8px; padding-left: 20px; }
.sw-steps li { margin: 2px 0; }
.sw-hint { font-size: 12px; color: #8b6d3b; margin: 0 0 8px; }
.sw-hint code, .sw-we code { background: #0d1117; padding: 0 4px; border-radius: 4px; }
.sw-verdict { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.sw-verdict button {
  flex: 1; min-width: 96px; padding: 6px; border-radius: 6px; cursor: pointer;
  border: 1px solid #30363d; background: #161b22; color: #e6edf3; font-size: 12px;
}
.sw-verdict button.sw-sel { border-color: #388bfd; background: rgba(56, 139, 253, .18); }
.sw-note {
  width: 100%; min-height: 44px; resize: vertical; font: 12px/1.4 inherit;
  background: #0d1117; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; padding: 6px 8px;
}
</style>
