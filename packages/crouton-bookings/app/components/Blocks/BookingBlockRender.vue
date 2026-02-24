<script setup lang="ts">
/**
 * Booking Block Public Renderer
 *
 * Renders a booking panel or wizard on public pages.
 * BlockContent.vue already wraps this in <ClientOnly> (clientOnly: true in definition).
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 */
import { computed } from 'vue'

interface BookingBlockAttrs {
  mode: 'panel' | 'wizard'
  title?: string
  emptyMessage?: string
}

interface Props {
  attrs: BookingBlockAttrs
}

const props = defineProps<Props>()

const mode = computed(() => props.attrs.mode || 'panel')
</script>

<template>
  <div class="booking-block my-8">
    <!-- Panel: title is rendered by the Panel component itself -->
    <CroutonBookingsPanel
      v-if="mode === 'panel'"
      :title="attrs.title || undefined"
      :empty-message="attrs.emptyMessage || undefined"
    />

    <!-- Wizard: title rendered here since Wizard has no title prop -->
    <template v-else>
      <h2 v-if="attrs.title" class="text-2xl font-bold mb-6">
        {{ attrs.title }}
      </h2>
      <CroutonBookingsCustomerBookingWizard />
    </template>
  </div>
</template>
