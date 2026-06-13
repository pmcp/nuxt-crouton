<script setup lang="ts">
/**
 * KDS (kitchen display) — spike for the `display` output driver (#60).
 * Subscribes to an event's order feed and lets staff "bump" orders when done.
 * Bump is client-side for the spike (sessionStorage); productionizing it into
 * the salesPrintqueues lifecycle (pending → shown → bumped) is the follow-up.
 */
definePageMeta({ layout: false })

interface KdsItem { title: string; quantity: number; remarks: string | null }
interface KdsOrder {
  id: string
  number: number | null
  clientName: string | null
  owner: string
  isPersonnel: boolean
  status: string
  createdAt: string
  items: KdsItem[]
}

const route = useRoute()
const eventId = computed(() => route.params.eventId as string)

const { data, refresh } = await useFetch<{ orders: KdsOrder[] }>(
  () => `/api/kds/${eventId.value}/orders`,
  { default: () => ({ orders: [] }) }
)

// Bumped order ids persist per-session so a refresh doesn't resurrect them.
const STORAGE_KEY = `kds-bumped-${eventId.value}`
const bumped = ref<Set<string>>(new Set())
onMounted(() => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) bumped.value = new Set(JSON.parse(raw))
  } catch { /* ignore */ }
})
function bump(id: string) {
  bumped.value = new Set([...bumped.value, id])
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...bumped.value])) } catch { /* ignore */ }
}

const active = computed(() => (data.value?.orders ?? []).filter(o => !bumped.value.has(o.id)))

// Poll every 2s; pause when the tab is hidden.
let timer: ReturnType<typeof setInterval> | null = null
function tick() { if (document.visibilityState !== 'hidden') refresh() }
onMounted(() => { timer = setInterval(tick, 2000); document.addEventListener('visibilitychange', tick) })
onUnmounted(() => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', tick) })

const now = ref(Date.now())
onMounted(() => { const t = setInterval(() => (now.value = Date.now()), 1000); onUnmounted(() => clearInterval(t)) })
function ago(iso: string) {
  const s = Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-5">
    <header class="flex items-center justify-between mb-5">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🍳</span>
        <h1 class="text-xl font-bold tracking-tight">Kitchen Display</h1>
        <span class="text-xs px-2 py-1 rounded bg-slate-800 text-slate-400 font-mono">{{ eventId }}</span>
      </div>
      <div class="flex items-center gap-2 text-sm text-slate-400">
        <span class="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
        live · {{ active.length }} active
      </div>
    </header>

    <div v-if="active.length === 0" class="flex flex-col items-center justify-center text-center text-slate-500 py-32">
      <span class="text-5xl mb-3">✅</span>
      <p class="text-lg">All caught up — no open orders.</p>
    </div>

    <TransitionGroup
      name="order"
      tag="div"
      class="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]"
    >
      <div
        v-for="o in active"
        :key="o.id"
        class="rounded-2xl bg-slate-900 border border-slate-800 shadow-lg overflow-hidden flex flex-col"
      >
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-slate-800"
          :class="o.isPersonnel ? 'bg-amber-500/15' : 'bg-slate-800/60'"
        >
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-extrabold">#{{ o.number ?? '—' }}</span>
            <span v-if="o.isPersonnel" class="text-[11px] font-bold uppercase text-amber-400">staff</span>
          </div>
          <span class="text-xs text-slate-400 tabular-nums">{{ ago(o.createdAt) }}</span>
        </div>

        <div class="px-4 py-3 flex-1">
          <p v-if="o.clientName" class="text-sm text-slate-400 mb-2">{{ o.clientName }}</p>
          <ul class="space-y-1.5">
            <li v-for="(it, i) in o.items" :key="i" class="flex gap-2 text-[15px]">
              <span class="font-bold text-emerald-400 tabular-nums min-w-[1.5rem]">{{ it.quantity }}×</span>
              <span class="flex-1">
                {{ it.title }}
                <span v-if="it.remarks" class="block text-xs text-amber-300/90">↳ {{ it.remarks }}</span>
              </span>
            </li>
          </ul>
        </div>

        <button
          class="px-4 py-3 text-sm font-bold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors"
          @click="bump(o.id)"
        >
          ✓ Bump
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.order-enter-active, .order-leave-active { transition: all .35s ease; }
.order-enter-from { opacity: 0; transform: translateY(-10px) scale(.97); }
.order-leave-to { opacity: 0; transform: scale(.92); }
</style>
