<script setup lang="ts">
import type { ChangelogRelease } from '~~/shared/types/changelog'

const props = defineProps<{
  release: ChangelogRelease
}>()

const importanceColor = computed(() => {
  switch (props.release.importance) {
    case 'critical': return 'error'
    case 'notable': return 'warning'
    default: return 'neutral'
  }
})

const priorityColor = computed(() => {
  switch (props.release.packagePriority) {
    case 'critical': return 'error'
    case 'high': return 'warning'
    default: return 'neutral'
  }
})

const formattedDate = computed(() => {
  return new Date(props.release.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
})
</script>

<template>
  <UCard class="group hover:ring-2 hover:ring-primary/20 transition-all">
    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 min-w-0">
          <UBadge :color="priorityColor" variant="soft" size="sm">
            {{ release.packageName }}
          </UBadge>
          <span class="font-mono font-semibold text-sm truncate">
            {{ release.tagName }}
          </span>
          <UBadge
            v-if="release.isPrerelease"
            color="warning"
            variant="outline"
            size="xs"
          >
            Pre-release
          </UBadge>
          <UBadge
            v-if="release.importance === 'critical'"
            color="error"
            variant="subtle"
            size="xs"
          >
            <UIcon name="i-lucide-alert-triangle" class="size-3 mr-1" />
            Breaking
          </UBadge>
        </div>
        <span class="text-sm text-muted shrink-0">{{ formattedDate }}</span>
      </div>
    </template>

    <div class="space-y-4">
      <!-- AI Summary -->
      <p class="text-default leading-relaxed">
        {{ release.summary || 'No summary available' }}
      </p>

      <!-- Breaking Changes -->
      <div
        v-if="release.breakingChanges?.length"
        class="space-y-2"
      >
        <p class="text-sm font-medium text-error flex items-center gap-1.5">
          <UIcon name="i-lucide-alert-triangle" class="size-4" />
          Breaking Changes
        </p>
        <ul class="list-disc list-inside text-sm text-muted space-y-1 ml-1">
          <li
            v-for="(change, i) in release.breakingChanges"
            :key="i"
          >
            {{ change }}
          </li>
        </ul>
      </div>

      <!-- New Features -->
      <div
        v-if="release.newFeatures?.length"
        class="space-y-2"
      >
        <p class="text-sm font-medium text-success flex items-center gap-1.5">
          <UIcon name="i-lucide-sparkles" class="size-4" />
          New Features
        </p>
        <ul class="list-disc list-inside text-sm text-muted space-y-1 ml-1">
          <li
            v-for="(feature, i) in release.newFeatures"
            :key="i"
          >
            {{ feature }}
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-xs text-muted">
          <UBadge :color="importanceColor" variant="subtle" size="xs">
            {{ release.importance }}
          </UBadge>
          <span v-if="release.relevanceScore">
            Relevance: {{ release.relevanceScore }}%
          </span>
        </div>
        <UButton
          :to="release.htmlUrl"
          target="_blank"
          variant="ghost"
          color="neutral"
          trailing-icon="i-lucide-external-link"
          size="xs"
        >
          Full Release Notes
        </UButton>
      </div>
    </template>
  </UCard>
</template>
