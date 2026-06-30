<script setup lang="ts">
import type { TraceEvent } from '~/composables/useLoopData'

const props = defineProps<{ events: TraceEvent[]; meta: any }>()

const KIND_COLOR: Record<string, string> = {
  agent: 'var(--ko-accent-orange)',
  skill: 'var(--ko-accent-blue)',
  tool: '#6a798b'
}
const t = (ts: string | null) => (ts ? ts.slice(11, 19) : '··:··:··')
const dur = (ms?: number) => (ms == null ? '' : ms >= 1000 ? `${(ms / 1000).toFixed(0)}s` : `${ms}ms`)
</script>

<template>
  <div class="tl">
    <div v-if="events.length === 0" class="tl__empty">No trace loaded.</div>
    <div
      v-for="(e, i) in events.slice(0, 120)"
      :key="i"
      class="tl__row"
      :style="{ paddingLeft: `${e.depth * 20}px` }"
    >
      <span class="tl__time">{{ t(e.ts) }}</span>
      <span class="tl__rail" :style="{ color: KIND_COLOR[e.kind] }">{{ e.depth > 0 ? '↳' : '•' }}</span>
      <span class="tl__kind" :style="{ background: KIND_COLOR[e.kind] }">{{ e.kind }}</span>
      <span class="tl__name">{{ e.name }}</span>
      <span v-if="e.parent !== 'root'" class="tl__parent">under {{ e.parent }}</span>
      <span v-if="dur(e.durMs)" class="tl__dur">{{ dur(e.durMs) }}</span>
    </div>
    <div v-if="events.length > 120" class="tl__more">+ {{ events.length - 120 }} more events</div>
  </div>
</template>

<style scoped>
.tl { font-family: var(--mono); font-size: 11.5px; max-height: 460px; overflow-y: auto; }
.tl__empty { color: var(--ko-text-label); }
.tl__row { display: flex; align-items: center; gap: 8px; padding: 3px 0; border-bottom: 1px solid #161616; white-space: nowrap; }
.tl__time { color: #44515f; }
.tl__rail { width: 10px; text-align: center; }
.tl__kind { color: #060606; font-size: 9px; text-transform: uppercase; letter-spacing: .04em; padding: 1px 5px; border-radius: 3px; }
.tl__name { color: var(--ko-text-light); }
.tl__parent { color: var(--ko-text-label); }
.tl__dur { margin-left: auto; color: var(--ko-accent-orange); }
.tl__more { color: var(--ko-text-label); padding-top: 8px; }
</style>
