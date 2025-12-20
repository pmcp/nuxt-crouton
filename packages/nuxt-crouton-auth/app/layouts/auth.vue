<script setup lang="ts">
/**
 * Auth Layout
 *
 * A modern, centered layout for authentication pages (login, register, etc.)
 * Features a gradient background with subtle patterns.
 */
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-default px-4 py-12 sm:px-6 lg:px-8">
    <!-- Background pattern -->
    <div class="absolute inset-0 -z-10 overflow-hidden">
      <div class="absolute left-[calc(50%-4rem)] top-10 -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:left-48 lg:top-[calc(50%-30rem)] xl:left-[calc(50%-24rem)]">
        <div
          class="aspect-[1108/632] w-[69.25rem] bg-gradient-to-r from-primary/20 to-primary/5 opacity-20"
          style="clip-path: polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)"
        />
      </div>
    </div>

    <!-- Content -->
    <div class="w-full max-w-md">
      <slot />
    </div>

    <!-- Footer -->
    <div class="mt-8 text-center text-sm text-muted">
      <slot name="footer" />
    </div>
  </div>
</template>
