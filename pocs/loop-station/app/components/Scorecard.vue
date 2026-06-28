<script setup lang="ts">
import type { HistoryRecord } from '~/composables/useLoopData'

const props = defineProps<{ record: HistoryRecord }>()

// Map a deterministic band to a KO LED colour.
const ledColor = (band: string) => (band === 'green' ? 'green' : band === 'amber' ? 'orange' : 'red')

const rows = computed(() => {
  const c = props.record.scorecard
  return [
    { key: 'length', label: 'Length', band: c.length.score, detail: `${(c.length.alwaysOnTokens / 1000).toFixed(1)}k always-on tok` },
    { key: 'redundancy', label: 'Redundancy', band: c.redundancy.score, detail: `${c.redundancy.pct}% restated` },
    { key: 'drift', label: 'Drift-risk', band: c.driftRisk.score, detail: `${c.driftRisk.pairs} kept-in-sync pair${c.driftRisk.pairs === 1 ? '' : 's'}` }
  ]
})
</script>

<template>
  <div class="card">
    <div class="card__overall">
      <KoLed :color="ledColor(record.scorecard.overall)" state="on" size="lg" />
      <span class="card__overall-txt">{{ record.scorecard.overall.toUpperCase() }}</span>
      <span class="card__tokenizer">{{ record.tokenizer }}</span>
    </div>
    <div v-for="r in rows" :key="r.key" class="card__row">
      <KoLed :color="ledColor(r.band)" state="on" size="md" />
      <span class="card__label">{{ r.label }}</span>
      <span class="card__detail">{{ r.detail }}</span>
      <span class="card__band" :class="`band-${r.band}`">{{ r.band }}</span>
    </div>
  </div>
</template>

<style scoped>
.card { display: flex; flex-direction: column; gap: 11px; }
.card__overall { display: flex; align-items: center; gap: 10px; padding-bottom: 10px; border-bottom: 1px solid #2a2a2a; }
.card__overall-txt { font-family: var(--mono); font-size: 18px; font-weight: 700; letter-spacing: .04em; color: var(--ko-text-light); }
.card__tokenizer { margin-left: auto; font-family: var(--mono); font-size: 10px; color: var(--ko-text-label); text-transform: uppercase; letter-spacing: .1em; }
.card__row { display: flex; align-items: center; gap: 10px; }
.card__label { font-size: 12px; color: var(--ko-text-muted); min-width: 88px; }
.card__detail { font-family: var(--mono); font-size: 12px; color: var(--ko-text-label); }
.card__band { margin-left: auto; font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
.band-green { color: #34d399; }
.band-amber { color: var(--ko-accent-orange); }
.band-red { color: var(--ko-accent-red); }
</style>
