import { ref, reactive, computed } from 'vue'
import specData from '~~/spec.json'

/**
 * useSpecWalk — shared state + logic for the in-app reconcile/verify walk (#1039).
 *
 * Module-singleton so the tool plugin (registers the launcher row + reads the badge
 * + flips `open`) and the panel component (renders the walk) share one reactive
 * source — the same pattern crouton-feedback's useChangelog uses. Verdicts persist
 * to localStorage; the export shape matches scripts/spec-walklist.mjs so pasting it
 * back flips the ledger (proposed→settled).
 */

export type SpecStatus = 'settled' | 'stopgap' | 'new' | 'proposed'
export interface SpecEntry {
  id: string; behaviour: string; when: string; expect: string; hook: string
  howToTest: string; status: SpecStatus; consideredRejected?: string[]
}
export type Verdict = 'confirmed' | 'contradicted' | 'undocumented'

const spec = (Array.isArray(specData) ? specData : []) as SpecEntry[]
const walk = spec.filter(e => e.status === 'proposed')
const refEntries = spec.filter(e => e.status !== 'proposed')
const STORE = 'specwalk:crouton-builder-demo'

// Singletons — shared across every useSpecWalk() call.
const open = ref(false)
const idx = ref(0)
const verdicts = reactive<Record<string, { verdict?: Verdict; note?: string }>>({})
let hydrated = false

const stepsOf = (e: SpecEntry) => (e.howToTest || '').split(/\s(?=\d\.\s)/).map(s => s.replace(/^\d\.\s*/, ''))
const selectorFor = (hook: string) => hook ? `[data-handoff="${hook.split('[')[0]}"]` : ''

export function useSpecWalk() {
  if (!hydrated && import.meta.client) {
    hydrated = true
    try { Object.assign(verdicts, JSON.parse(localStorage.getItem(STORE) || '{}')) } catch { /* fresh */ }
  }
  const persist = () => { if (import.meta.client) { try { localStorage.setItem(STORE, JSON.stringify(verdicts)) } catch { /* ignore */ } } }

  const marked = computed(() => walk.filter(e => verdicts[e.id]?.verdict).length)
  const current = computed(() => walk[idx.value])

  function setVerdict(v: Verdict) {
    const e = current.value; if (!e) return
    verdicts[e.id] = { ...(verdicts[e.id] || {}), verdict: v }; persist()
    if (idx.value < walk.length - 1) setTimeout(() => { idx.value++ }, 160)
  }
  function setNote(val: string) {
    const e = current.value; if (!e) return
    verdicts[e.id] = { ...(verdicts[e.id] || {}), note: val }; persist()
  }
  const go = (d: number) => { idx.value = Math.min(walk.length - 1, Math.max(0, idx.value + d)) }

  const exportPayload = computed(() => ({
    spec: 'crouton-builder-demo',
    verdicts: walk.map(e => ({ id: e.id, status: e.status, verdict: verdicts[e.id]?.verdict || 'skipped', note: verdicts[e.id]?.note || '' })),
    readonly: refEntries.map(e => ({ id: e.id, status: e.status }))
  }))
  const exportText = computed(() => JSON.stringify(exportPayload.value, null, 2))

  return { open, idx, walk, verdicts, marked, current, setVerdict, setNote, go, exportText, stepsOf, selectorFor }
}
