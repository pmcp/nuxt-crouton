<script setup lang="ts">
import { computed } from 'vue'
import { useChangelog } from '../composables/useChangelog'

/**
 * ChangelogOverlay — the timeline modal for the Changelog tool.
 *
 * Mounted once (via changelog.client plugin) into the host app's context and
 * toggled by the shared `open` flag from useChangelog. Renders the changelog as
 * a timeline: `vNN` + note + commit, newest first, the current (top) entry
 * accented. When the current entry has no commit of its own, the build-time
 * `buildCommit` fills in the live deployed sha.
 */
const { entries, latest, open, commitUrl, buildCommit } = useChangelog()

// The commit shown for a given entry: its own hash, or (for the current entry)
// the build-stamped deployed sha as a fallback.
function commitFor(commit: string | undefined, index: number): string | undefined {
  return commit || (index === 0 ? buildCommit || undefined : undefined)
}

const hasEntries = computed(() => entries.value.length > 0)
</script>

<template>
  <UModal v-model:open="open" title="Changelog" data-crouton-ui>
    <template #content="{ close }">
      <div class="p-6 max-h-[80vh] overflow-y-auto" data-crouton-ui>
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-history" class="size-5 text-primary" />
            <h3 class="text-lg font-semibold">Changelog</h3>
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

        <p v-if="!hasEntries" class="text-sm text-muted">
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
              <template v-if="commitFor(entry.commit, index)">
                <a
                  v-if="commitUrl(commitFor(entry.commit, index))"
                  :href="commitUrl(commitFor(entry.commit, index)) || undefined"
                  target="_blank"
                  rel="noopener"
                  class="ms-auto inline-flex items-center gap-1 text-xs text-muted hover:text-default font-mono"
                >
                  <UIcon name="i-lucide-git-commit-horizontal" class="size-3.5" />
                  {{ commitFor(entry.commit, index)!.slice(0, 7) }}
                </a>
                <span
                  v-else
                  class="ms-auto inline-flex items-center gap-1 text-xs text-muted font-mono"
                >
                  <UIcon name="i-lucide-git-commit-horizontal" class="size-3.5" />
                  {{ commitFor(entry.commit, index)!.slice(0, 7) }}
                </span>
              </template>
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
