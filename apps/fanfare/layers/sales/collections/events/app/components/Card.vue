<script setup lang="ts">
/**
 * SalesEventsCard
 *
 * Custom card for the events collection grid view.
 * Clicking the card navigates to the Event Workspace.
 *
 * Registered as: SalesEventsCard (via layers/sales/collections/events/nuxt.config.ts)
 */
import type { SalesEvent } from '../../types'

const props = defineProps<{
  item: SalesEvent
  layout: 'list' | 'grid'
  collection: string
  size?: 'compact' | 'comfortable' | 'spacious'
  stateless?: boolean
}>()

const route = useRoute()
const router = useRouter()
const { open } = useCrouton()
const { t } = useT()

const teamParam = computed(() => route.params.team as string)

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

function dateRange(event: SalesEvent): string {
  const start = formatDate(event.startDate)
  const end = formatDate(event.endDate)
  if (start && end) return `${start} – ${end}`
  return start || end || t('sales.events.noDates')
}

function statusColor(status: string): 'success' | 'warning' | 'neutral' | 'error' {
  switch (status) {
    case 'active': return 'success'
    case 'upcoming': return 'warning'
    case 'completed': return 'neutral'
    case 'cancelled': return 'error'
    default: return 'neutral'
  }
}

function openWorkspace() {
  router.push(`/admin/${teamParam.value}/sales/events/${props.item.slug}`)
}

function openEdit() {
  open('update', props.collection, [props.item.id])
}
</script>

<template>
  <UCard
    variant="outline"
    :ui="{
      root: 'group cursor-pointer hover:shadow-md hover:border-primary/30 transition-all h-full flex flex-col',
      body: 'flex-1 flex flex-col p-4'
    }"
    @click="openWorkspace"
  >
    <!-- Top row: title + status -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="font-semibold text-base truncate group-hover:text-primary transition-colors">
        {{ item.title }}
      </h3>
      <UBadge
        :color="statusColor(item.status)"
        variant="subtle"
        size="sm"
        class="shrink-0"
      >
        {{ item.status }}
      </UBadge>
    </div>

    <!-- Meta -->
    <div class="space-y-1.5 text-sm text-muted flex-1">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-tag" class="shrink-0 text-xs" />
        <span class="capitalize">{{ item.eventType || t('sales.events.standard') }}</span>
      </div>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-calendar" class="shrink-0 text-xs" />
        <span>{{ dateRange(item) }}</span>
      </div>
      <p v-if="item.description" class="line-clamp-2 text-xs mt-1">
        {{ item.description }}
      </p>
    </div>

    <!-- Footer actions -->
    <div class="flex items-center gap-2 mt-4 pt-3 border-t border-default">
      <UButton
        variant="ghost"
        size="xs"
        icon="i-lucide-arrow-right"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop="openWorkspace"
      >
        {{ t('sales.events.workspace') }}
      </UButton>

      <UButton
        v-if="item.isCurrent"
        color="primary"
        variant="ghost"
        size="xs"
        icon="i-lucide-shopping-cart"
        class="ml-auto"
        @click.stop="router.push(`/order/${teamParam}/${item.slug}`)"
      >
        {{ t('sales.title') }}
      </UButton>

      <UButton
        v-else
        variant="ghost"
        size="xs"
        icon="i-lucide-pencil"
        class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
        @click.stop="openEdit"
      >
        {{ t('sales.events.edit') }}
      </UButton>
    </div>
  </UCard>
</template>
