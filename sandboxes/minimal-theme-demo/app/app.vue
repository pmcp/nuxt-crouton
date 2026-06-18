<script setup lang="ts">
// Minimal-theme button check (spike #364). The `minimal` theme's app.config
// installs a GLOBAL base-slot replacer that strips Nuxt UI's decorative defaults
// (rounded-*/shadow-*/ring-*) and tags the element `minimal-flat`. So every
// <UButton> below — even the plain ones with no `variant` — should render flat.

const checks = [
  'Plain <UButton> (Section A): SQUARE corners, no drop shadow, no focus ring on click/Tab.',
  'Inspect a button in devtools: it carries the class "minimal-flat" and has NO rounded-* / shadow-* / ring-* utility classes on its base element.',
  'variant="minimal" buttons (Section B/C) keep their minimal look (filled black primary, outline, etc.).',
  'Refresh / hard-reload a few times: NO hydration mismatch warning in the browser console.'
]

const colors = ['primary', 'neutral', 'error'] as const
const minimalVariants = ['minimal', 'minimal-outline', 'minimal-soft', 'minimal-ghost', 'minimal-link'] as const
</script>

<template>
  <div class="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto space-y-10">
    <header class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">minimal theme — button check</h1>
      <p class="text-sm text-neutral-500">
        Spike #364 · Nuxt UI 4.9 slot-class replacer · single-theme app (extends only
        <code>@fyit/crouton-themes/minimal</code>)
      </p>
    </header>

    <section class="border border-black p-4 space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide">What to check</h2>
      <ul class="list-disc list-inside text-sm space-y-1">
        <li v-for="(c, i) in checks" :key="i">{{ c }}</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide">A · Plain &lt;UButton&gt; (no variant)</h2>
      <p class="text-sm text-neutral-500">
        The base replacer is global, so these default buttons prove defaults are stripped:
        they should be flat (square corners, no shadow/ring) despite using no theme variant.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <UButton>Default</UButton>
        <UButton color="primary">Primary</UButton>
        <UButton color="neutral" variant="outline">Outline</UButton>
        <UButton color="error" variant="soft">Soft</UButton>
        <UButton color="primary" variant="ghost">Ghost</UButton>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide">B · variant="minimal" × colors</h2>
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          v-for="color in colors"
          :key="color"
          variant="minimal"
          :color="color"
        >
          {{ color }}
        </UButton>
      </div>
    </section>

    <section class="space-y-3">
      <h2 class="text-sm font-semibold uppercase tracking-wide">C · minimal variants (primary)</h2>
      <div class="flex flex-wrap items-center gap-3">
        <UButton
          v-for="variant in minimalVariants"
          :key="variant"
          :variant="variant"
          color="primary"
        >
          {{ variant }}
        </UButton>
      </div>
    </section>
  </div>
</template>
