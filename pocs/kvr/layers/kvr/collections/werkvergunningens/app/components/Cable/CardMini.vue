<script setup lang="ts">
interface CableRow {
  id: string
  van?: string
  naar?: string
  buitenSpanningGeaard?: boolean
  losgekoppeld?: boolean
  sleufGeidentificeerd?: boolean
}

interface Props {
  value?: CableRow[] | CableRow | null
}

const props = defineProps<Props>()

const rows = computed<CableRow[]>(() => {
  if (!props.value) return []
  return Array.isArray(props.value) ? props.value : [props.value]
})

const filledRows = computed(() => rows.value.filter(r => (r.van && r.van.length) || (r.naar && r.naar.length)))
</script>

<template>
  <div class="text-sm">
    <span v-if="!filledRows.length" class="text-gray-400">—</span>
    <div v-else class="flex flex-col gap-0.5">
      <div
        v-for="(row, i) in filledRows.slice(0, 3)"
        :key="row.id ?? i"
        class="flex items-center gap-1.5 text-xs"
      >
        <span class="font-semibold text-neutral-600">K{{ i + 1 }}</span>
        <span class="text-neutral-800">{{ row.van || '—' }}</span>
        <UIcon name="i-lucide-arrow-right" class="size-3 text-neutral-400 shrink-0" />
        <span class="text-neutral-800">{{ row.naar || '—' }}</span>
        <span v-if="row.buitenSpanningGeaard" class="ml-1 rounded px-1 py-0 text-[10px] bg-green-100 text-green-800">geaard</span>
        <span v-if="row.losgekoppeld" class="ml-1 rounded px-1 py-0 text-[10px] bg-amber-100 text-amber-800">losgek.</span>
        <span v-if="row.sleufGeidentificeerd" class="ml-1 rounded px-1 py-0 text-[10px] bg-purple-100 text-purple-800">sleuf</span>
      </div>
      <div v-if="filledRows.length > 3" class="text-[11px] text-neutral-400">
        +{{ filledRows.length - 3 }} meer
      </div>
    </div>
  </div>
</template>
