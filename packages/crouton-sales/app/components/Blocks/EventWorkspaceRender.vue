<script setup lang="ts">
/**
 * Event Workspace Block Public Renderer
 *
 * One block, two faces by session:
 *
 *   signed-in team member →  the full workspace shell (kassa + settings /
 *                             orders / clients panes; event fixed by the
 *                             editor, so the switcher is hidden)
 *   anonymous / volunteer →  an "Open kassa" launcher that opens the POS
 *                             (<SalesPosPanel>) in a fullscreen modal
 *
 * Why a launcher + modal (not an inline or `fixed inset-0` panel): the block
 * lives inside a normal scrollable CMS page and can sit beside other blocks
 * (a QR code, a button row). A `fixed inset-0` takeover left those siblings
 * scrollable behind it, which iOS Safari rubber-bands ("the page scrolls
 * while it doesn't"). UModal's Reka dialog locks the page scroll properly,
 * portals to <body>, and is iOS-reliable — and the launch is explicit, so
 * the public page stays a clean, ordinary in-flow page. The launcher (this
 * "kassa opening module") owns the helper session display + logout; the
 * modal is a pure ordering surface with just a close button.
 *
 * The member shell does a top-level `await`, so it gets a local <Suspense>
 * (BlockContent.vue wraps us in <ClientOnly>, which is not a Suspense
 * boundary). The panel loads client-side, so it needs none.
 */
interface EventWorkspaceAttrs {
  eventSlug?: string
  /**
   * @deprecated The volunteer kassa is now a fullscreen modal launched on
   * demand, not an inline panel — height no longer applies. Kept so stored
   * `height` attrs on existing nodes don't break.
   */
  height?: 'compact' | 'tall' | 'fill'
}

const props = defineProps<{ attrs: EventWorkspaceAttrs }>()

const { t } = useT()
const { loggedIn } = useAuth()

const eventSlug = computed(() => props.attrs.eventSlug || '')

// The kassa opens in a fullscreen modal — the panel mounts (and fetches) on
// first open. The helper session indicator + logout live in the page nav's
// auth pill (the scoped-session-nav plugin bridges them), not here.
const kassaOpen = ref(false)
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

    <!-- Team member session → the full workspace (event fixed, no switcher).
         No border: the shell frames its own kassa; p-6 stays so the block
         keeps the exact same width as the previously bordered version. -->
    <div v-else-if="loggedIn" class="rounded-3xl bg-default p-6">
      <Suspense>
        <SalesEventWorkspaceShell :event-slug="eventSlug" :show-switcher="false" />
        <template #fallback>
          <div class="p-6 text-center text-muted">{{ t('sales.common.loading') }}</div>
        </template>
      </Suspense>
    </div>

    <!-- Anonymous → "Open kassa" launcher (owns session + logout) and the
         POS in a fullscreen modal. -->
    <template v-else>
      <div class="rounded-3xl border border-default bg-default p-8 flex flex-col items-center gap-5 text-center">
        <p class="text-sm text-muted">{{ t('sales.block.openKassaHint') }}</p>
        <UButton size="xl" @click="kassaOpen = true">
          {{ t('sales.block.makeOrder') }}
        </UButton>
      </div>

      <UModal v-model:open="kassaOpen" fullscreen :ui="{ content: 'bg-default' }">
        <template #content>
          <!-- Safe-area padding: the content is fixed inset-0, so keep the
               header off the notch and the cart bar above Safari's bottom bar
               (env() needs viewport-fit=cover — set by the viewport-meta plugin). -->
          <div class="flex flex-col h-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
            <SalesPosPanel
              :event-slug="eventSlug"
              closable
              class="flex-1 min-h-0"
              @close="kassaOpen = false"
            />
          </div>
        </template>
      </UModal>
    </template>
  </div>
</template>
