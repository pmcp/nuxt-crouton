<script setup lang="ts">
/**
 * Event Workspace Block Public Renderer
 *
 * The single sales block for CMS pages — one block, two faces by session:
 *
 *   signed-in team member →  the full workspace shell (kassa + settings /
 *                             orders / clients panes; event fixed by the
 *                             editor, so the switcher is hidden)
 *   anonymous / volunteer →  the kassa only, via <SalesPosPanel> (inline
 *                             helper PIN login, then the order interface)
 *
 * This replaced the separate orderInterfaceBlock — the volunteer face IS the
 * old kassa block, so existing `orderInterfaceBlock` nodes in stored page
 * content must be migrated to this node type (same attrs incl. `height`).
 *
 * The shell does a top-level `await useCollectionQuery`, so we give it a local
 * <Suspense> boundary (BlockContent.vue wraps us in <ClientOnly>, which is not
 * a Suspense boundary).
 */
interface EventWorkspaceAttrs {
  eventSlug?: string
  /**
   * Volunteer-kassa height: compact/tall flow inside the page, 'fill' grows
   * to the viewport bottom. The admin shell sizes itself and ignores this.
   */
  height?: 'compact' | 'tall' | 'fill'
}

const props = defineProps<{ attrs: EventWorkspaceAttrs }>()

const { t } = useT()
const { loggedIn } = useAuth()

const eventSlug = computed(() => props.attrs.eventSlug || '')

// --- Volunteer kassa height ------------------------------------------------
// Compact/Tall are simple bounded heights that flow inside the page. Fill
// measures the wrapper's distance from the top of the viewport and grows to
// the bottom edge, so a POS-only page reads as a full-screen app. Recomputed
// on mount + resize (not on scroll — the POS scrolls internally, not the page).
// On phones the kassa always fills to the viewport bottom — a helper taking
// orders wants a full-screen app, not a 60/80vh card with the page peeking
// through. compact/tall only apply from sm up. (Renderer is clientOnly, so
// the media query is reliable from the first paint.)
const isPhone = useMediaQuery('(max-width: 639px)')
const heightMode = computed(() =>
  isPhone.value ? 'fill' : (props.attrs.height || 'tall')
)
const posWrapper = ref<HTMLElement | null>(null)
const fillHeight = ref('')

const posHeightClass = computed(() => {
  if (heightMode.value === 'compact') return 'h-[60vh]'
  if (heightMode.value === 'tall') return 'h-[80vh]'
  return '' // fill drives height via inline style
})
const posHeightStyle = computed(() =>
  heightMode.value === 'fill' && fillHeight.value
    ? { height: fillHeight.value }
    : undefined
)

function recomputeFillHeight() {
  if (heightMode.value !== 'fill' || !posWrapper.value) return
  const top = Math.max(0, Math.round(posWrapper.value.getBoundingClientRect().top))
  fillHeight.value = `calc(100dvh - ${top}px)`
}

useEventListener('resize', recomputeFillHeight)

// The kassa wrapper only exists in the volunteer branch — (re)measure when it
// appears (mount, or a logout flipping the branch) or the height mode changes.
watch([posWrapper, heightMode], async () => {
  await nextTick()
  recomputeFillHeight()
})
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

    <!-- Anonymous → kassa only; the panel owns the helper PIN login flow -->
    <div
      v-else
      ref="posWrapper"
      class="rounded-3xl border border-default overflow-clip bg-default flex flex-col"
      :class="posHeightClass"
      :style="posHeightStyle"
    >
      <SalesPosPanel :event-slug="eventSlug" />
    </div>
  </div>
</template>