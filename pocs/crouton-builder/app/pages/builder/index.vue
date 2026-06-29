<script setup lang="ts">
/**
 * Site flow (#988) — `/builder`. The pages of the app as a wireable sitemap; each card
 * deep-links to its board (`/builder/[pageId]`). Real routing replaces the POC's single
 * -route v-if/cross-fade: a card carries a `view-transition-name` matching its board, so
 * the View Transitions API morphs the card INTO the board (and back) — the shared-element
 * grow. `[data-handoff="page-badge"]` marks the ★ home page (the live entry).
 */
const { pages } = useBuilderDocument()

useHead({ title: 'Builder · Site flow' })

const statusColor = (s?: string) => (s === 'published' ? 'success' : s === 'archived' ? 'neutral' : 'warning')
</script>

<template>
  <div class="mx-auto max-w-5xl p-6">
    <header class="mb-6 flex items-center gap-3">
      <UIcon name="i-lucide-layout-template" class="size-6 text-primary" />
      <div>
        <h1 class="text-xl font-bold">Site flow</h1>
        <p class="text-sm text-muted">Tap a page to open its board. Layouts round-trip onto the ticket.</p>
      </div>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="page in pages"
        :key="page.id"
        :to="`/builder/${page.id}`"
        class="group relative block rounded-xl border border-default bg-elevated/40 p-4 transition hover:border-primary hover:shadow-lg"
        :style="{ viewTransitionName: `page-${page.id}` }"
      >
        <UBadge
          v-if="page.isHome"
          data-handoff="page-badge"
          color="primary"
          variant="solid"
          size="xs"
          class="absolute -top-2 left-3"
        >
          <UIcon name="i-lucide-star" class="size-3" /> Home
        </UBadge>

        <div class="mb-3 flex items-center gap-2">
          <span class="size-2 rounded-full" :class="`bg-${statusColor(page.status)}`" />
          <span class="font-semibold">{{ page.name }}</span>
          <UBadge class="ml-auto" size="xs" color="neutral" variant="subtle">{{ page.path }}</UBadge>
        </div>

        <!-- A static read-only preview of the page's composed layout (hug-aware, #986). -->
        <div class="pointer-events-none h-40 overflow-hidden rounded-lg border border-default bg-default/30">
          <CroutonLayoutRenderer :node="page.tree.root" :interactive="false" />
        </div>

        <div class="mt-3 flex items-center gap-2 text-xs text-muted">
          <UIcon :name="page.inNav ? 'i-lucide-check' : 'i-lucide-minus'" class="size-3.5" />
          <span>{{ page.inNav ? 'in nav' : 'hidden' }}</span>
          <span class="ml-auto">{{ page.visibility }}</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>
