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

// Inject page layout from the page component
const pageLayout = inject<Ref<'default' | 'full-height' | 'full-screen'>>('pageLayout', ref('default'))

// Compute layout-specific classes
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
  <div class="bg-background" :class="containerClasses">
    <!-- Floating navigation -->
    <CroutonPagesNav />

    <!-- Main content -->
    <main :class="mainClasses">
      <slot />
    </main>
  </div>
</template>
