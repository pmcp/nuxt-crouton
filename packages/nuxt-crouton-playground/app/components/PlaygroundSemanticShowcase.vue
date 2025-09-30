<script setup lang="ts">
// Component to showcase Nuxt UI semantic utilities
</script>

<template>
  <section>
    <h3 class="text-xl font-semibold text-default mb-6">
      Theme Showcase
    </h3>

    <div class="space-y-6">
      <!-- Neutral Color Impact -->
      <div>
        <h4 class="text-sm font-medium text-default mb-3">
          Neutral Color Usage
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Backgrounds -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-muted">Backgrounds</p>
            <div class="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 rounded">
              <p class="text-sm text-neutral-900 dark:text-neutral-100">Default Background</p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Uses neutral-50 / 950</p>
            </div>
            <div class="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded">
              <p class="text-sm text-neutral-900 dark:text-neutral-100">Elevated Background</p>
              <p class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Uses neutral-100 / 900</p>
            </div>
          </div>

          <!-- Text Colors -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-muted">Text Colors</p>
            <div class="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 p-4 rounded space-y-2">
              <p class="text-sm text-neutral-900 dark:text-neutral-100">Primary Text (neutral-900)</p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400">Muted Text (neutral-600)</p>
              <p class="text-sm text-neutral-500">Dimmed Text (neutral-500)</p>
              <p class="text-xs text-neutral-400 dark:text-neutral-600">Subtle Text (neutral-400)</p>
            </div>
          </div>

          <!-- Borders -->
          <div class="space-y-2">
            <p class="text-xs font-semibold text-muted">Borders</p>
            <div class="bg-neutral-50 dark:bg-neutral-950 p-4 rounded space-y-3">
              <div class="border border-neutral-200 dark:border-neutral-800 p-3 rounded">
                <p class="text-sm text-neutral-900 dark:text-neutral-100">Default Border</p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">neutral-200 / 800</p>
              </div>
              <div class="border-2 border-neutral-300 dark:border-neutral-700 p-3 rounded">
                <p class="text-sm text-neutral-900 dark:text-neutral-100">Strong Border</p>
                <p class="text-xs text-neutral-600 dark:text-neutral-400">neutral-300 / 700</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded">
          <p class="text-sm text-amber-900 dark:text-amber-100">
            <strong>💡 Tip:</strong> The "neutral" color you select controls backgrounds, borders, and text throughout your entire theme. Try changing it to see the impact!
          </p>
        </div>
      </div>

      <!-- Semantic Colors in Action -->
      <div>
        <h4 class="text-sm font-medium text-default mb-3">
          Semantic Colors
        </h4>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div class="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 p-4 rounded">
            <p class="text-sm font-semibold text-primary-900 dark:text-primary-100">Primary</p>
            <p class="text-xs text-primary-600 dark:text-primary-400">Brand color</p>
          </div>
          <div class="bg-success-50 dark:bg-success-950 border border-success-200 dark:border-success-800 p-4 rounded">
            <p class="text-sm font-semibold text-success-900 dark:text-success-100">Success</p>
            <p class="text-xs text-success-600 dark:text-success-400">Positive</p>
          </div>
          <div class="bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 p-4 rounded">
            <p class="text-sm font-semibold text-warning-900 dark:text-warning-100">Warning</p>
            <p class="text-xs text-warning-600 dark:text-warning-400">Caution</p>
          </div>
          <div class="bg-error-50 dark:bg-error-950 border border-error-200 dark:border-error-800 p-4 rounded">
            <p class="text-sm font-semibold text-error-900 dark:text-error-100">Error</p>
            <p class="text-xs text-error-600 dark:text-error-400">Danger</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
