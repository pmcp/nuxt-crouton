<script setup lang="ts">
/**
 * Public Layout
 *
 * Layout for public-facing pages like /[team]/[slug].
 * Features a floating pill-style navigation inspired by Nuxt UI portfolio template.
 */
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Floating navigation -->
    <CroutonPagesNav />

    <!-- Main content with top padding for floating nav -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8">
      <slot />
    </main>
  </div>
</template>
