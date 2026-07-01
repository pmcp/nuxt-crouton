<script setup lang="ts">
/**
 * /three — crouton-three demo page.
 *
 * Two live sections proving the @fyit/crouton-three layer works end-to-end in a
 * real app:
 *  1. CroutonThreeStarterScene — a WASD / arrow-key controllable cube (the game
 *     starter, driven by useThreeControls).
 *  2. CroutonThreeModelViewer — loads a glTF/.glb model with orbit + auto-rotate.
 *     This is the same renderer the crouton-pages "3D Model" block uses.
 */
useHead({ title: '3D demo — crouton-three' })

// Model shipped in /public/models so it works offline and on Cloudflare (no CORS).
const modelSrc = '/models/duck.glb'
</script>

<template>
  <div class="min-h-screen bg-default">
    <UContainer class="py-10 sm:py-16 space-y-12">
      <!-- Header -->
      <header class="space-y-3 text-center">
        <UBadge color="primary" variant="subtle" size="lg" class="mb-1">
          <UIcon name="i-lucide-box" class="size-4 mr-1" />
          @fyit/crouton-three
        </UBadge>
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-highlighted">
          Interactive 3D, running in a real crouton app
        </h1>
        <p class="text-muted max-w-2xl mx-auto">
          TresJS (Three.js for Vue) as a crouton layer — a playable WASD scene and
          a glTF model viewer. Open this on your phone and drag to orbit.
        </p>
      </header>

      <!-- Section 1: WASD starter scene -->
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-gamepad-2" class="size-5 text-primary" />
          <h2 class="text-xl font-semibold text-highlighted">Playable scene — WASD</h2>
        </div>
        <p class="text-sm text-muted">
          <code class="text-primary">CroutonThreeStarterScene</code> wires
          <code class="text-primary">useThreeControls()</code> to a cube on a lit,
          shadowed ground plane. Use <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd>
          <kbd>D</kbd> or the arrow keys to move; drag to orbit the camera.
        </p>
        <CroutonThreeStarterScene :height="520" />
      </section>

      <!-- Section 2: glTF model viewer (the 3D Model block renderer) -->
      <section class="space-y-4">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-rotate-3d" class="size-5 text-primary" />
          <h2 class="text-xl font-semibold text-highlighted">glTF model viewer</h2>
        </div>
        <p class="text-sm text-muted">
          <code class="text-primary">CroutonThreeModelViewer</code> loads a
          <code class="text-primary">.glb</code> with orbit controls and
          auto-rotate. This is exactly what the crouton-pages
          <strong>3D Model</strong> block drops onto a CMS page.
        </p>
        <CroutonThreeModelViewer
          :src="modelSrc"
          :height="520"
          background="#0b0b12"
          :auto-rotate="true"
          :grid="true"
        />
        <p class="text-xs text-muted text-center">
          Model: Khronos “Duck” glTF sample asset (served from
          <code>/public/models/duck.glb</code>).
        </p>
      </section>

      <USeparator />

      <footer class="text-center text-sm text-muted">
        Built with
        <NuxtLink to="https://github.com/FriendlyInternet/nuxt-crouton" target="_blank" class="text-primary hover:underline">
          nuxt-crouton
        </NuxtLink>
        · the 3D Model block becomes available in the page editor when
        <code>@fyit/crouton-pages</code> is installed.
      </footer>
    </UContainer>
  </div>
</template>
