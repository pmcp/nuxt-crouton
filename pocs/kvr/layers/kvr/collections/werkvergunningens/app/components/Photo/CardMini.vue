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

const openIndex = ref<number | null>(null)
const isOpen = computed({
  get: () => openIndex.value !== null,
  set: (v: boolean) => { if (!v) openIndex.value = null },
})
const current = computed(() => openIndex.value !== null ? withAssets.value[openIndex.value] : null)

function openPhoto(i: number, e: Event) {
  e.stopPropagation()
  e.preventDefault()
  openIndex.value = i
}
function prev() {
  if (openIndex.value === null) return
  openIndex.value = (openIndex.value - 1 + withAssets.value.length) % withAssets.value.length
}
function next() {
  if (openIndex.value === null) return
  openIndex.value = (openIndex.value + 1) % withAssets.value.length
}

function onKey(e: KeyboardEvent) {
  if (openIndex.value === null) return
  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === 'Escape') openIndex.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="text-sm">
    <span v-if="!withAssets.length" class="text-gray-400">—</span>
    <div v-else class="flex items-center gap-1.5">
      <button
        v-for="(row, i) in withAssets.slice(0, 4)"
        :key="row.id ?? i"
        type="button"
        class="size-9 overflow-hidden rounded-sm border border-neutral-200 bg-neutral-100 hover:ring-2 hover:ring-purple-500 transition"
        :title="row.caption || 'Bekijk foto'"
        @click="openPhoto(i, $event)"
      >
        <img
          :src="`/images/${row.assetId}`"
          :alt="row.caption || `Foto ${i + 1}`"
          class="h-full w-full object-cover"
          loading="lazy"
        >
      </button>
      <button
        v-if="withAssets.length > 4"
        type="button"
        class="text-[11px] text-neutral-500 hover:text-neutral-800 px-1"
        @click="openPhoto(4, $event)"
      >
        +{{ withAssets.length - 4 }}
      </button>
    </div>

    <UModal v-model:open="isOpen">
      <template #content="{ close }">
        <div class="relative bg-neutral-950 text-white" @click.stop>
          <img
            v-if="current?.assetId"
            :src="`/images/${current.assetId}`"
            :alt="current.caption || ''"
            class="block w-full max-h-[80vh] object-contain"
          >
          <button
            type="button"
            class="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 hover:bg-black/80"
            aria-label="Sluiten"
            @click="close"
          >
            <UIcon name="i-lucide-x" class="size-4" />
          </button>
          <template v-if="withAssets.length > 1">
            <button
              type="button"
              class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
              aria-label="Vorige"
              @click="prev"
            >
              <UIcon name="i-lucide-chevron-left" class="size-5" />
            </button>
            <button
              type="button"
              class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/60 p-2 hover:bg-black/80"
              aria-label="Volgende"
              @click="next"
            >
              <UIcon name="i-lucide-chevron-right" class="size-5" />
            </button>
          </template>
          <div class="flex items-center justify-between px-4 py-2 text-sm">
            <span>{{ current?.caption || '—' }}</span>
            <span class="text-neutral-400">{{ (openIndex ?? 0) + 1 }} / {{ withAssets.length }}</span>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
