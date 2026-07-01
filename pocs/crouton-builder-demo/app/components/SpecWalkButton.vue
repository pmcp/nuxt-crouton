<script setup lang="ts">
/**
 * SpecWalkButton — the in-app reconcile/verify walk (#1039), as a NON-BLOCKING panel.
 *
 * Rendered on-page in spike-app.vue next to the v52 chip (the only surface proven to
 * show on mobile staging). Earlier the walk used driver.js (a *tour* engine) — wrong
 * tool: its modal overlay dims the app and blocks the very gestures the test steps ask
 * for ("tap a card", "drag a block"), and on mobile the popover covered the element it
 * highlighted. A *verification* walk needs an *inspector*, not a tour.
 *
 * So this is a collapsible bottom-sheet panel with NO overlay: the board stays fully
 * interactive, you actually perform each step, then mark ✅/⚠️/➕. For the 5 hooked
 * entries a lightweight, pointer-events:none outline tracks the live element (rAF, so it
 * stays glued through Vue Flow pan/zoom); gesture-transient hooks show a hint instead.
 * Verdicts persist to localStorage; Export copies the JSON (same shape as
 * scripts/spec-walklist.mjs) to paste back to the agent (flips proposed→settled).
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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

const expanded = ref(false)
const showExport = ref(false)
const idx = ref(0)
const verdicts = reactive<Record<string, { verdict?: Verdict; note?: string }>>({})
const hl = reactive({ show: false, x: 0, y: 0, w: 0, h: 0 })

const current = computed(() => walk[idx.value])
const marked = computed(() => walk.filter(e => verdicts[e.id]?.verdict).length)
const stepsOf = (e: SpecEntry) => (e.howToTest || '').split(/\s(?=\d\.\s)/).map(s => s.replace(/^\d\.\s*/, ''))
const selectorFor = (hook: string) => hook ? `[data-handoff="${hook.split('[')[0]}"]` : ''

onMounted(() => { try { Object.assign(verdicts, JSON.parse(localStorage.getItem(STORE) || '{}')) } catch { /* fresh */ } })
watch(verdicts, () => { try { localStorage.setItem(STORE, JSON.stringify(verdicts)) } catch { /* ignore */ } }, { deep: true })

function setVerdict(v: Verdict) {
  const e = current.value; if (!e) return
  verdicts[e.id] = { ...(verdicts[e.id] || {}), verdict: v }
  if (idx.value < walk.length - 1) setTimeout(() => { idx.value++ }, 160)
}
function setNote(val: string) {
  const e = current.value; if (!e) return
  verdicts[e.id] = { ...(verdicts[e.id] || {}), note: val }
}
const go = (d: number) => { idx.value = Math.min(walk.length - 1, Math.max(0, idx.value + d)) }

// Non-blocking outline that tracks the current hooked element (survives pan/zoom).
let raf = 0
function track() {
  const e = current.value
  const sel = e ? selectorFor(e.hook) : ''
  const el = sel && expanded.value && !showExport.value ? document.querySelector(sel) : null
  if (el) {
    const r = el.getBoundingClientRect()
    hl.show = r.width > 0 && r.height > 0
    hl.x = r.x; hl.y = r.y; hl.w = r.width; hl.h = r.height
  } else { hl.show = false }
  raf = requestAnimationFrame(track)
}
onMounted(() => { raf = requestAnimationFrame(track) })
onBeforeUnmount(() => cancelAnimationFrame(raf))

const exportPayload = computed(() => ({
  spec: 'crouton-builder-demo',
  verdicts: walk.map(e => ({ id: e.id, status: e.status, verdict: verdicts[e.id]?.verdict || 'skipped', note: verdicts[e.id]?.note || '' })),
  readonly: refEntries.map(e => ({ id: e.id, status: e.status }))
}))
const exportText = computed(() => JSON.stringify(exportPayload.value, null, 2))
const copied = ref(false)
async function copyExport() {
  try { await navigator.clipboard.writeText(exportText.value); copied.value = true; setTimeout(() => copied.value = false, 1500) } catch { /* ignore */ }
}
</script>

<template>
  <!-- Non-blocking element outline (only for hooked entries with a live element). -->
  <div
    v-if="hl.show"
    class="pointer-events-none fixed z-40 rounded-md ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-150"
    :style="{ left: hl.x + 'px', top: hl.y + 'px', width: hl.w + 'px', height: hl.h + 'px' }"
  />

  <!-- Collapsed launcher pill (bottom-left, above the v52 chip). -->
  <UButton
    v-if="!expanded"
    class="fixed bottom-8 left-1 z-50 font-mono text-[10px]"
    size="xs"
    color="primary"
    variant="soft"
    icon="i-lucide-footprints"
    :label="`Spec walk ${marked}/${walk.length}`"
    @click="expanded = true"
  />

  <!-- Expanded bottom-sheet panel — NO overlay, board stays interactive. -->
  <div
    v-else
    class="fixed inset-x-0 bottom-0 z-50 max-h-[52dvh] overflow-y-auto rounded-t-2xl border-t border-default bg-elevated/95 shadow-2xl backdrop-blur"
  >
    <div class="mx-auto flex max-w-2xl flex-col gap-3 p-4">
      <!-- header -->
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-footprints" class="size-4 text-primary" />
        <span class="text-sm font-semibold">Spec walk</span>
        <span class="font-mono text-[11px] text-muted">{{ showExport ? 'export' : `${idx + 1} / ${walk.length}` }}</span>
        <span class="ms-1 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] text-primary">{{ marked }}/{{ walk.length }}</span>
        <div class="ms-auto flex items-center gap-1">
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-download" :label="showExport ? 'Walk' : 'Export'" @click="showExport = !showExport" />
          <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-chevron-down" aria-label="Collapse" @click="expanded = false" />
        </div>
      </div>

      <!-- progress -->
      <div class="h-1.5 overflow-hidden rounded-full bg-default">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: (marked / walk.length * 100) + '%' }" />
      </div>

      <!-- EXPORT view -->
      <template v-if="showExport">
        <p class="text-xs text-muted">{{ marked }} of {{ walk.length }} marked. Copy this and paste it back to the agent — confirmed entries flip <code>proposed → settled</code>.</p>
        <UTextarea :model-value="exportText" :rows="10" readonly class="w-full font-mono text-[11px]" />
        <UButton size="sm" color="primary" :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'" :label="copied ? 'Copied' : 'Copy JSON'" @click="copyExport" />
      </template>

      <!-- WALK view -->
      <template v-else-if="current">
        <div class="flex items-center gap-2">
          <code class="text-xs text-primary">{{ current.id }}</code>
          <span v-if="current.hook" class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">🔖 {{ current.hook }}</span>
        </div>
        <p class="text-sm font-medium">{{ current.behaviour }}</p>
        <div class="rounded-lg bg-default/60 p-2.5 text-[13px]">
          <span class="text-[10px] uppercase tracking-wide text-muted">When</span> {{ current.when }}
          <span class="text-primary">→</span>
          <span class="text-[10px] uppercase tracking-wide text-muted">Expect</span> {{ current.expect }}
        </div>
        <ol class="list-decimal space-y-1 ps-5 text-[13px] text-muted">
          <li v-for="(s, i) in stepsOf(current)" :key="i">{{ s }}</li>
        </ol>
        <p v-if="current.hook && !hl.show" class="text-[12px] text-warning">
          🔖 <code>{{ current.hook }}</code> appears during the gesture — do the steps and it lights up.
        </p>

        <div class="flex flex-wrap gap-2">
          <UButton size="sm" :color="verdicts[current.id]?.verdict === 'confirmed' ? 'success' : 'neutral'" :variant="verdicts[current.id]?.verdict === 'confirmed' ? 'solid' : 'soft'" label="✅ Confirmed" class="flex-1" @click="setVerdict('confirmed')" />
          <UButton size="sm" :color="verdicts[current.id]?.verdict === 'contradicted' ? 'warning' : 'neutral'" :variant="verdicts[current.id]?.verdict === 'contradicted' ? 'solid' : 'soft'" label="⚠️ Contradicted" class="flex-1" @click="setVerdict('contradicted')" />
          <UButton size="sm" :color="verdicts[current.id]?.verdict === 'undocumented' ? 'primary' : 'neutral'" :variant="verdicts[current.id]?.verdict === 'undocumented' ? 'solid' : 'soft'" label="➕ Undocumented" class="flex-1" @click="setVerdict('undocumented')" />
        </div>
        <UTextarea :model-value="verdicts[current.id]?.note || ''" :rows="2" placeholder="note / delta — what the POC actually does…" class="w-full text-[13px]" @update:model-value="setNote($event)" />

        <div class="flex items-center gap-2 pt-1">
          <UButton size="sm" color="neutral" variant="ghost" icon="i-lucide-arrow-left" label="Prev" :disabled="idx === 0" @click="go(-1)" />
          <span class="grow" />
          <UButton v-if="idx < walk.length - 1" size="sm" color="neutral" variant="soft" trailing-icon="i-lucide-arrow-right" label="Next" @click="go(1)" />
          <UButton v-else size="sm" color="primary" variant="soft" icon="i-lucide-download" label="Export" @click="showExport = true" />
        </div>
      </template>
    </div>
  </div>
</template>
