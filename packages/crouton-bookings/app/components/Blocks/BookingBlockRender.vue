<script setup lang="ts">
/**
 * Booking Block Public Renderer
 *
 * Renders a booking panel on public pages.
 * BlockContent.vue already wraps this in <ClientOnly> (clientOnly: true in definition).
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 */

interface BookingBlockAttrs {
  title?: string
  emptyMessage?: string
}

interface Props {
  attrs: BookingBlockAttrs
}

defineProps<Props>()
</script>

<template>
  <div class="booking-block my-8">
    <CroutonBookingsPanel
      :title="attrs.title || undefined"
      :empty-message="attrs.emptyMessage || undefined"
    />
  </div>
</template>
