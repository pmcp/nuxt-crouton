<script setup lang="ts">
interface PhotoRow {
  id: string
  assetId?: string
  caption?: string
}

interface Props {
  value?: PhotoRow[] | PhotoRow | null
}

const props = defineProps<Props>()

const rows = computed<PhotoRow[]>(() => {
  if (!props.value) return []
  return Array.isArray(props.value) ? props.value : [props.value]
})

const withAssets = computed(() => rows.value.filter(r => r.assetId))
</script>

<template>
  <div class="text-sm">
    <span v-if="!withAssets.length" class="text-gray-400">—</span>
    <div v-else class="flex items-center gap-1.5">
      <div
        v-for="(row, i) in withAssets.slice(0, 4)"
        :key="row.id ?? i"
        class="size-9 overflow-hidden rounded-sm border border-neutral-200 bg-neutral-100"
        :title="row.caption || ''"
      >
        <img
          :src="`/images/${row.assetId}`"
          :alt="row.caption || `Foto ${i + 1}`"
          class="h-full w-full object-cover"
          loading="lazy"
        >
      </div>
      <span v-if="withAssets.length > 4" class="text-[11px] text-neutral-500">
        +{{ withAssets.length - 4 }}
      </span>
    </div>
  </div>
</template>
