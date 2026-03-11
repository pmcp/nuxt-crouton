<script setup lang="ts">
// Redirect to team graph page if authenticated
const { user } = useAuth()

// For now, simple landing that redirects to admin
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950">
    <div class="text-center max-w-md">
      <UIcon name="i-lucide-brain-circuit" class="size-16 text-primary-500 mb-6" />
      <h1 class="text-3xl font-bold mb-3">ThinkGraph</h1>
      <p class="text-neutral-500 dark:text-neutral-400 mb-8">
        Your thinking belongs to you. Branch, explore, and merge ideas across any AI.
      </p>
      <UButton
        to="/admin"
        label="Open Graph"
        size="lg"
        icon="i-lucide-arrow-right"
        trailing
      />
    </div>
  </div>
</template>
