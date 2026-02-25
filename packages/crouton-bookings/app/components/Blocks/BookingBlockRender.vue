<script setup lang="ts">
/**
 * Booking Block Public Renderer
 *
 * Renders a booking panel on public pages.
 * BlockContent.vue already wraps this in <ClientOnly> (clientOnly: true in definition).
 *
 * When access is 'members', shows a login prompt for unauthenticated users.
 *
 * NOTE: This component must NOT use top-level await (no async setup).
 */

interface BookingBlockAttrs {
  title?: string
  emptyMessage?: string
  access?: 'public' | 'members'
  scope?: 'personal' | 'team'
}

interface Props {
  attrs: BookingBlockAttrs
}

const props = defineProps<Props>()

const { loggedIn } = useAuth()
const { t } = useI18n()
const route = useRoute()

const requiresLogin = computed(() => props.attrs.access === 'members' && !loggedIn.value)

const loginUrl = computed(() => `/auth/login?redirect=${encodeURIComponent(route.fullPath)}`)
</script>

<template>
  <div class="booking-block my-8">
    <!-- Members-only: show login prompt when not authenticated -->
    <div
      v-if="requiresLogin"
      class="bg-muted/80 backdrop-blur-sm rounded-3xl border border-default shadow-lg shadow-neutral-950/5 p-8 text-center"
    >
      <div class="mx-auto max-w-sm space-y-4">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
          <UIcon name="i-lucide-lock" class="w-6 h-6 text-primary" />
        </div>
        <h3 class="text-lg font-semibold text-default">
          {{ attrs.title || t('bookings.title') }}
        </h3>
        <p class="text-sm text-muted">
          {{ t('bookings.panel.membersOnly') }}
        </p>
        <UButton
          :to="loginUrl"
          color="primary"
          size="lg"
          icon="i-lucide-log-in"
        >
          {{ t('bookings.panel.signIn') }}
        </UButton>
      </div>
    </div>

    <!-- Authenticated or public: show the booking panel -->
    <div
      v-else
      class="bg-muted/80 backdrop-blur-sm rounded-3xl border border-default shadow-lg shadow-neutral-950/5 overflow-clip"
    >
      <CroutonBookingsPanel
        :title="attrs.title || undefined"
        :empty-message="attrs.emptyMessage || undefined"
        :scope="attrs.scope || 'personal'"
      />
    </div>
  </div>
</template>

<style scoped>
/* Strip Panel's own container styling — the frosted wrapper provides it */
.booking-block :deep(.booking-panel) {
  border: none;
  border-radius: 0;
  background: transparent;
}

</style>
