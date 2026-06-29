<script setup lang="ts">
</script>

<template>
  <UApp>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div class="max-w-3xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Crouton Feedback Playground
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8">
          A plain Nuxt UI app with only <code>@fyit/crouton-feedback</code> installed —
          no crouton-core. Once the runtime workstreams land, the glasses launcher
          appears bottom-right with the <strong>Console</strong> and
          <strong>Annotate</strong> tools.
        </p>

        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold">
              What to look for
            </h2>
          </template>

          <div class="space-y-3 text-gray-600 dark:text-gray-400">
            <p>· The glasses button in the bottom-right corner (arrives in #962).</p>
            <p>· <strong>Console</strong> → opens eruda, a mobile in-page console.</p>
            <p>· <strong>Annotate</strong> → pin a comment on any element and send it
              to the configured destination.</p>
          </div>
        </UCard>
      </div>
    </div>
  </UApp>
</template>
