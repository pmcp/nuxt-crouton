<script setup lang="ts">
/**
 * Public Layout
 *
 * Layout for public-facing pages like /[team]/[slug].
 * Features a floating pill-style navigation inspired by Nuxt UI portfolio template.
 *
 * Supports three layout modes via pageLayout injection:
 * - default: Normal scrollable content with max-width and padding
 * - full-height: Fixed viewport height, content fills remaining space (for apps like bookings)
 * - full-screen: No padding, full viewport (for landing pages)
 */

// Get page layout from shared state (set by page component via useState)
const pageLayout = useState<'default' | 'full-height' | 'full-screen'>('pageLayout', () => 'default')

// Refs for manual DOM update after hydration (to fix SSR mismatch)
const containerRef = ref<HTMLElement>()
const mainRef = ref<HTMLElement>()

// Apply layout classes to DOM elements
// Needed because: 1) SSR hydration mismatch, 2) navigation between pages
function applyLayoutClasses() {
  if (!containerRef.value || !mainRef.value) return

  const container = containerRef.value
  const main = mainRef.value

  switch (pageLayout.value) {
    case 'full-height':
      container.className = 'bg-background h-screen flex flex-col overflow-hidden'
      main.className = 'flex-1 overflow-hidden pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8'
      break
    case 'full-screen':
      container.className = 'bg-background min-h-screen'
      main.className = 'pt-16'
      break
    default:
      container.className = 'bg-background min-h-screen'
      main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8'
  }
}

// Apply on mount (fixes SSR hydration mismatch)
onMounted(() => {
  nextTick(applyLayoutClasses)
})

// Watch for layout changes (handles navigation between pages)
watch(pageLayout, () => {
  nextTick(applyLayoutClasses)
})

// Compute layout-specific classes (used for SSR, then manually fixed after hydration)
const containerClasses = computed(() => {
  switch (pageLayout.value) {
    case 'full-height':
      return 'h-screen flex flex-col overflow-hidden'
    case 'full-screen':
      return 'min-h-screen'
    default:
      return 'min-h-screen'
  }
})

const mainClasses = computed(() => {
  switch (pageLayout.value) {
    case 'full-height':
      return 'flex-1 overflow-hidden pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8'
    case 'full-screen':
      return 'pt-16'
    default:
      return 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8'
  }
})
</script>

<template>
  <div ref="containerRef" class="bg-background" :class="containerClasses">
    <!-- Floating navigation -->
    <CroutonPagesNav />

    <!-- Main content -->
    <main ref="mainRef" :class="mainClasses">
      <slot />
    </main>
  </div>
</template>
