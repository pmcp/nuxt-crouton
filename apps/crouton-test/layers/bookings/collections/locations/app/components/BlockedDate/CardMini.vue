<template>
  <div class="text-sm">
    <template v-if="normalizedValue.length > 0">
      <div class="flex flex-wrap gap-1">
        <UBadge
          v-for="(item, index) in normalizedValue.slice(0, 3)"
          :key="index"
          color="error"
          variant="subtle"
        >
          <span v-if="item.startDate && item.endDate">
            {{ formatDate(item.startDate) }} – {{ formatDate(item.endDate) }}
          </span>
          <span v-else-if="item.startDate">
            {{ formatDate(item.startDate) }}
          </span>
          <span v-else>
            {{ item.reason || 'Blocked' }}
          </span>
        </UBadge>
        <UBadge v-if="normalizedValue.length > 3" color="error" variant="subtle">
          +{{ normalizedValue.length - 3 }} more
        </UBadge>
      </div>
    </template>
    <span v-else class="text-gray-400">—</span>
  </div>
</template>

<script setup lang="ts">
interface BlockedDate {
  id?: string
  startDate?: string
  endDate?: string
  reason?: string
  blockedSlots?: string[]
}

interface Props {
  value?: BlockedDate[] | BlockedDate | null
}

const props = defineProps<Props>()

const normalizedValue = computed(() => {
  if (!props.value) return []
  return Array.isArray(props.value) ? props.value : [props.value]
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
</script>
