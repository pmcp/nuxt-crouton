<script setup lang="ts">
/**
 * Event Storefront Block Public Renderer
 *
 * Renders a public-facing event storefront card on CMS pages: title, status
 * badge, and a CTA to the existing /order/[team]/[event] POS surface.
 *
 * The render is intentionally minimal — richer details (description, dates,
 * product gallery) would need new public endpoints. Today the only public
 * sales endpoint exposes {id, title, slug, status} via by-slug.
 *
 * BlockContent.vue wraps this in <ClientOnly> (clientOnly: true in def).
 */

interface EventStorefrontAttrs {
  eventSlug?: string
  title?: string
  ctaLabel?: string
}

interface Props {
  attrs: EventStorefrontAttrs
}

interface PublicEvent {
  id: string
  teamId: string
  title: string
  slug: string
  status: string
}

const props = defineProps<Props>()
const route = useRoute()

// CMS pages render at /[team]/[...slug] — team slug is in route params.
const teamSlug = computed(() => String(route.params.team || ''))

const { data: eventData, error } = useFetch<PublicEvent>(
  () => `/api/crouton-sales/events/${teamSlug.value}/by-slug/${props.attrs.eventSlug}`,
  {
    key: () => `sales-storefront:${teamSlug.value}:${props.attrs.eventSlug || ''}`,
    immediate: !!props.attrs.eventSlug && !!teamSlug.value,
    watch: [() => props.attrs.eventSlug, teamSlug]
  }
)

const orderUrl = computed(() =>
  teamSlug.value && props.attrs.eventSlug
    ? `/order/${teamSlug.value}/${props.attrs.eventSlug}`
    : null
)
</script>

<template>
  <div class="event-storefront-block">
    <!-- Unconfigured: editor forgot to pick an event -->
    <div
      v-if="!attrs.eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-store" class="w-6 h-6 mx-auto mb-2 text-muted" />
      No event selected for this storefront.
    </div>

    <!-- Fetch failed: event slug invalid or no longer accessible -->
    <div
      v-else-if="error"
      class="bg-muted/80 rounded-3xl border border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-alert-circle" class="w-6 h-6 mx-auto mb-2 text-muted" />
      Event "{{ attrs.eventSlug }}" not found.
    </div>

    <!-- Loading -->
    <div
      v-else-if="!eventData"
      class="bg-muted/80 rounded-3xl border border-default p-6 text-center"
    >
      <UIcon name="i-lucide-loader-2" class="w-6 h-6 mx-auto animate-spin text-muted" />
    </div>

    <!-- Storefront card -->
    <div
      v-else
      class="bg-default rounded-3xl border border-default shadow-lg shadow-neutral-950/5 p-8"
    >
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div class="space-y-2">
          <h2 class="text-2xl font-semibold text-default">
            {{ attrs.title || eventData.title }}
          </h2>
          <div class="flex items-center gap-2">
            <UBadge
              :color="eventData.status === 'active' ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            >
              {{ eventData.status }}
            </UBadge>
            <span class="text-xs text-muted font-mono">{{ eventData.slug }}</span>
          </div>
        </div>
        <UButton
          v-if="orderUrl"
          :to="orderUrl"
          size="lg"
          icon="i-lucide-shopping-cart"
          trailing-icon="i-lucide-arrow-right"
        >
          {{ attrs.ctaLabel || 'Order Now' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
