<script setup lang="ts">
import { computed } from 'vue'
import { useState } from 'nuxt/app'

/**
 * SpikeChangelogTool — the overlay for the "Changelog" crouton-devtools tool.
 *
 * Mounted once (via app.vue) and toggled open by the devtools-version client
 * plugin through the shared `spike-changelog-open` useState flag. Reads the
 * spike's own changelog (`app/spike-changelog.json`) and renders it as a
 * timeline: vNN + note + commit, newest first, the current (top) entry accented.
 *
 * The changelog file is owned by the serial spike work and may not exist yet;
 * `import.meta.glob` resolves to an empty set rather than a build error when it
 * is absent, so this component is harmless on its own.
 */

interface ChangelogEntry {
  v: number
  note: string
  commit?: string
}

// Shared open state with app/plugins/devtools-version.client.ts.
const open = useState<boolean>('spike-changelog-open', () => false)

// Eager glob: bundles the JSON if present, empty object if not — no hard import
// that would break the build while the serial work hasn't added the file yet.
const modules = import.meta.glob('../spike-changelog.json', { eager: true }) as Record<
  string,
  { default?: ChangelogEntry[] } | ChangelogEntry[]
>

const entries = computed<ChangelogEntry[]>(() => {
  const mod = Object.values(modules)[0]
  if (!mod) return []
  const data = Array.isArray(mod) ? mod : mod.default
  if (!Array.isArray(data)) return []
  // Newest first; defensively re-sort by version descending.
  return [...data].sort((a, b) => (b.v ?? 0) - (a.v ?? 0))
})

const latest = computed(() => entries.value[0]?.v ?? null)
</script>

<template>
  <UModal v-model:open="open" title="Spike changelog">
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">Crouton Builder — changelog</h3>
            <UBadge v-if="latest !== null" color="primary" variant="subtle" size="sm">
              v{{ latest }}
            </UBadge>
          </div>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            aria-label="Close changelog"
            @click="close"
          />
        </div>

        <p v-if="!entries.length" class="text-sm text-muted">
          No changelog entries yet.
        </p>

        <ol v-else class="relative border-s border-default ps-6 space-y-5">
          <li
            v-for="(entry, index) in entries"
            :key="entry.v"
            class="relative"
          >
            <span
              class="absolute -start-[1.9rem] mt-1 flex size-3 rounded-full ring-4 ring-default"
              :class="index === 0 ? 'bg-primary' : 'bg-muted'"
            />
            <div class="flex items-center gap-2">
              <UBadge
                :color="index === 0 ? 'primary' : 'neutral'"
                :variant="index === 0 ? 'solid' : 'subtle'"
                size="sm"
              >
                v{{ entry.v }}
              </UBadge>
              <span
                v-if="index === 0"
                class="text-xs uppercase tracking-wide text-primary font-medium"
              >
                current
              </span>
              <a
                v-if="entry.commit"
                :href="`https://github.com/FriendlyInternet/nuxt-crouton/commit/${entry.commit}`"
                target="_blank"
                rel="noopener"
                class="ms-auto inline-flex items-center gap-1 text-xs text-muted hover:text-default font-mono"
              >
                <UIcon name="i-lucide-git-commit-horizontal" class="size-3.5" />
                {{ entry.commit.slice(0, 7) }}
              </a>
            </div>
            <p
              class="mt-1 text-sm"
              :class="index === 0 ? 'text-default' : 'text-muted'"
            >
              {{ entry.note }}
            </p>
          </li>
        </ol>
      </div>
    </template>
  </UModal>
</template>
