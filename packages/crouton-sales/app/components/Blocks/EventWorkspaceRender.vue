<script setup lang="ts">
/**
 * Event Workspace Block Public Renderer
 *
 * Embeds the full admin event workspace (Products / Orders / Printers /
 * Settings tabs) for one event inside a CMS page. The editor fixes the event
 * via the block's `eventSlug` attribute, so the switcher is hidden.
 *
 * This is an ADMIN surface: the tabs fetch and mutate via authenticated
 * `/api/teams/[team]/...` endpoints. It is only useful to a signed-in team
 * member viewing the page — anonymous visitors see a sign-in notice instead of
 * broken tabs.
 *
 * The shell does a top-level `await useCollectionQuery`, so we give it a local
 * <Suspense> boundary (BlockContent.vue wraps us in <ClientOnly>, which is not
 * a Suspense boundary).
 */
interface EventWorkspaceAttrs {
  eventSlug?: string
}

const props = defineProps<{ attrs: EventWorkspaceAttrs }>()

const { t } = useT()
const { loggedIn } = useAuth()

const eventSlug = computed(() => props.attrs.eventSlug || '')
</script>

<template>
  <div class="event-workspace-block">
    <!-- Editor didn't pick an event -->
    <div
      v-if="!eventSlug"
      class="bg-muted/80 rounded-3xl border border-dashed border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-store" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.block.noEventPicked') }}
    </div>

    <!-- Admin surface: requires a signed-in team member -->
    <div
      v-else-if="!loggedIn"
      class="bg-muted/80 rounded-3xl border border-default p-6 text-center text-sm text-muted"
    >
      <UIcon name="i-lucide-lock" class="w-6 h-6 mx-auto mb-2 text-muted" />
      {{ t('sales.block.signInRequired') }}
    </div>

    <!-- Signed in → render the workspace (event fixed, no switcher) -->
    <div v-else class="rounded-3xl border border-default bg-default p-6">
      <Suspense>
        <SalesEventWorkspaceShell :event-slug="eventSlug" :show-switcher="false" />
        <template #fallback>
          <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
        </template>
      </Suspense>
    </div>
  </div>
</template>
