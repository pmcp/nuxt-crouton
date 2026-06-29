<script setup lang="ts">
// Public landing for the blog POC. The admin area lives behind /admin (auth-gated).
definePageMeta({ layout: false })

// SPIKE (#945) — this is the whole app-side surface: call track() on intent.
// No vendor SDK imported; the provider is resolved from config behind useCroutonAnalytics().
const { track, events, providerId } = useCroutonAnalytics()

function onAdminClick() {
  track('cta_click', { cta: 'go_to_admin', surface: 'landing' })
}
function onDemoKeyAction() {
  track('key_action', { action: 'demo_button', surface: 'landing' })
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-4 bg-(--ui-bg) p-6 text-center">
    <UIcon name="i-lucide-newspaper" class="size-10 text-(--ui-primary)" />
    <h1 class="text-2xl font-semibold text-(--ui-text-highlighted)">
      Blog
    </h1>
    <p class="max-w-md text-(--ui-text-muted)">
      A crouton POC. The content admin lives behind a login.
    </p>
    <div class="flex gap-2">
      <UButton to="/admin" icon="i-lucide-lock" color="primary" @click="onAdminClick">
        Go to admin
      </UButton>
      <UButton icon="i-lucide-sparkles" color="neutral" variant="subtle" @click="onDemoKeyAction">
        Demo key action
      </UButton>
    </div>

    <!-- SPIKE-ONLY: live event log so analytics is visible without a backend key. -->
    <div class="mt-8 w-full max-w-md text-left">
      <div class="mb-2 flex items-center justify-between text-xs text-(--ui-text-muted)">
        <span>crouton-analytics · live events (spike)</span>
        <UBadge size="sm" color="neutral" variant="subtle">provider: {{ providerId }}</UBadge>
      </div>
      <div class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 font-mono text-xs">
        <p v-if="!events.length" class="text-(--ui-text-dimmed)">
          no events yet — click a button or reload
        </p>
        <ul v-else class="space-y-1">
          <li v-for="(e, i) in events" :key="i" class="flex gap-2">
            <span class="text-(--ui-primary)">{{ e.event }}</span>
            <span class="text-(--ui-text-dimmed) truncate">{{ JSON.stringify(e.props) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
