<script setup lang="ts">
/**
 * Landing page. The 3D demo lives at /three; this keeps the root URL friendly
 * for opening on a phone.
 */
useHead({ title: 'crouton-three demo' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default">
    <UContainer class="py-16">
      <div class="max-w-xl mx-auto text-center space-y-6">
        <UIcon name="i-lucide-boxes" class="size-14 text-primary mx-auto" />
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-highlighted">
          crouton-three
        </h1>
        <p class="text-muted">
          A tiny app that proves the <code class="text-primary">@fyit/crouton-three</code>
          layer — interactive 3D scenes, a WASD game starter, and a glTF model
          viewer — works in a real crouton app.
        </p>
        <div class="flex items-center justify-center gap-3">
          <UButton to="/three" size="lg" trailing-icon="i-lucide-arrow-right">
            Open the 3D demo
          </UButton>
        </div>
      </div>
    </UContainer>
  </div>
</template>
