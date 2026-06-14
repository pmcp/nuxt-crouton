<script setup lang="ts">
/**
 * Kitchen Display (KDS) Block — public renderer (#61, decoupled KDS).
 *
 * Drop-on-a-page kitchen screen for an iPad. It is NOT a printer: it reads the
 * event's orders directly and shows one ticket per (order × location), so the
 * kitchen screen and the bar screen each see only their items and bump them
 * independently. "Done" lives in `salesKdsbumps`; bumping never touches the
 * print queue or the order's status.
 *
 * The editor fixes the event by slug and (optionally) which locations this
 * screen shows; we resolve the slug to an id via the public by-slug endpoint,
 * then poll the feed scoped to those locations. clientOnly — BlockContent wraps
 * us in <ClientOnly>; no top-level await, so no Suspense boundary is needed.
 */
interface KitchenDisplayAttrs {
  eventSlug?: string
  /** Locations this screen shows; empty/absent = every location in the event. */
  locations?: string[]
}

interface KdsItem { title: string, quantity: number, remarks?: string | null }
interface KdsJob {
  id: string
  orderId: string
  locationId: string
  orderNumber: string
  clientName: string | null
  isPersonnel: boolean
  createdAt: string
  items: KdsItem[]
}

const props = defineProps<{ attrs: KitchenDisplayAttrs }>()

const { t } = useT()
const route = useRoute()

const eventSlug = computed(() => props.attrs.eventSlug || '')
const teamParam = computed(() => String(route.params.team || ''))

const eventId = ref<string | null>(null)
const eventNotFound = ref(false)
const jobs = ref<KdsJob[]>([])

// Optimistically hide a job the moment it's bumped, so the tile leaves
// immediately instead of waiting for the next poll. The queue is the real
// source of truth — the next refresh confirms it's gone.
const bumping = ref<Set<string>>(new Set())

async function resolveEvent() {
  if (!eventSlug.value || !teamParam.value) return
  try {
    const ev = await $fetch<{ id: string }>(
      `/api/crouton-sales/events/${teamParam.value}/by-slug/${eventSlug.value}`
    )
    eventId.value = ev.id
  }
  catch {
    eventNotFound.value = true
  }
}

// Locations this screen shows, as a query param; empty = the whole event.
const locationsParam = computed(() => (props.attrs.locations || []).filter(Boolean).join(','))

async function refresh() {
  if (!eventId.value) return
  try {
    const res = await $fetch<{ jobs: KdsJob[] }>(
      `/api/crouton-sales/events/${eventId.value}/display-jobs`,
      { query: locationsParam.value ? { locations: locationsParam.value } : undefined }
    )
    jobs.value = res.jobs
  }
  catch {
    // Transient blip — keep the last board until the next poll.
  }
}

async function bump(job: KdsJob) {
  if (!eventId.value) return
  bumping.value = new Set([...bumping.value, job.id])
  try {
    await $fetch(`/api/crouton-sales/events/${eventId.value}/kds-bump`, {
      method: 'POST',
      body: { orderId: job.orderId, locationId: job.locationId }
    })
    await refresh()
  }
  catch {
    // Bump failed — show the tile again so it can be retried.
    const next = new Set(bumping.value)
    next.delete(job.id)
    bumping.value = next
  }
}

const active = computed(() => jobs.value.filter(j => !bumping.value.has(j.id)))

// Poll every 2s; pause when the tab is hidden.
let timer: ReturnType<typeof setInterval> | null = null
function tick() { if (document.visibilityState !== 'hidden') refresh() }

onMounted(async () => {
  await resolveEvent()
  await refresh()
  timer = setInterval(tick, 2000)
  document.addEventListener('visibilitychange', tick)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', tick)
})

// Relative "Xs / Xm Ys" age, ticking once a second.
const now = ref(Date.now())
onMounted(() => {
  const t2 = setInterval(() => (now.value = Date.now()), 1000)
  onUnmounted(() => clearInterval(t2))
})
function ago(iso: string) {
  const s = Math.max(0, Math.floor((now.value - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
}
</script>

<template>
  <div class="kitchen-display-block">
    <!-- Editor didn't pick an event -->
    <div
      v-if="!eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-monitor" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.block.noEventPicked') }}
    </div>

    <!-- Picked event no longer resolves (deleted / stale slug) -->
    <div
      v-else-if="eventNotFound"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-monitor-x" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.blocks.kitchenDisplay.ui.eventNotFound') }}
    </div>

    <!-- The board -->
    <div v-else class="rounded-3xl overflow-hidden bg-slate-950 text-slate-100 p-5">
      <header class="flex items-center justify-between mb-5">
        <div class="flex items-center gap-3">
          <span class="text-2xl">🍳</span>
          <h1 class="text-xl font-bold tracking-tight">{{ t('sales.blocks.kitchenDisplay.ui.title') }}</h1>
        </div>
        <div class="flex items-center gap-2 text-sm text-slate-400">
          <span class="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
          {{ t('sales.blocks.kitchenDisplay.ui.live') }} · {{ t('sales.blocks.kitchenDisplay.ui.active', { count: active.length }) }}
        </div>
      </header>

      <div v-if="active.length === 0" class="flex flex-col items-center justify-center text-center text-slate-500 py-32">
        <span class="text-5xl mb-3">✅</span>
        <p class="text-lg">{{ t('sales.blocks.kitchenDisplay.ui.allCaughtUp') }}</p>
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
              <span class="text-2xl font-extrabold">#{{ o.orderNumber }}</span>
              <span v-if="o.isPersonnel" class="text-[11px] font-bold uppercase text-amber-400">{{ t('sales.blocks.kitchenDisplay.ui.staff') }}</span>
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
            @click="bump(o)"
          >
            ✓ {{ t('sales.blocks.kitchenDisplay.ui.bump') }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </div>
</template>

<style scoped>
.order-enter-active, .order-leave-active { transition: all .35s ease; }
.order-enter-from { opacity: 0; transform: translateY(-10px) scale(.97); }
.order-leave-to { opacity: 0; transform: scale(.92); }
</style>
