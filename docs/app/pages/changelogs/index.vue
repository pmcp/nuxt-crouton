<script setup lang="ts">
import type { ChangelogRelease, ChangelogPackage } from '~~/shared/types/changelog'

definePageMeta({
  layout: 'docs'
})

useSeoMeta({
  title: 'Changelog Tracker',
  ogTitle: 'Changelog Tracker - Nuxt Crouton',
  description: 'AI-summarized releases from key Nuxt ecosystem packages',
  ogDescription: 'Stay updated with the latest releases, breaking changes, and new features from Nuxt, Vue, Nuxt UI, and more.'
})

// Filters
const selectedPackages = ref<string[]>([])
const selectedImportance = ref<string | null>(null)

// Fetch packages for filter
const { data: packagesData } = await useFetch<{ packages: ChangelogPackage[] }>('/api/changelogs/packages')

// Fetch releases with filters
const { data: changelogData, pending, refresh } = await useFetch<{
  releases: ChangelogRelease[]
  total: number
  lastSyncedAt: string | null
}>('/api/changelogs', {
  query: computed(() => ({
    packages: selectedPackages.value.length > 0 ? selectedPackages.value.join(',') : undefined,
    importance: selectedImportance.value || undefined,
    limit: 50
  })),
  watch: [selectedPackages, selectedImportance]
})

const importanceOptions = [
  { label: 'All Releases', value: null },
  { label: 'Critical Only', value: 'critical' },
  { label: 'Notable', value: 'notable' },
  { label: 'Minor', value: 'minor' }
]

const lastSyncedFormatted = computed(() => {
  if (!changelogData.value?.lastSyncedAt) return 'Never'
  const date = new Date(changelogData.value.lastSyncedAt)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const releaseStats = computed(() => {
  if (!changelogData.value?.releases) return { critical: 0, notable: 0, minor: 0 }
  return {
    critical: changelogData.value.releases.filter(r => r.importance === 'critical').length,
    notable: changelogData.value.releases.filter(r => r.importance === 'notable').length,
    minor: changelogData.value.releases.filter(r => r.importance === 'minor').length
  }
})
</script>

<template>
  <UPage>
    <UPageHeader
      title="Changelog Tracker"
      description="AI-summarized releases from key Nuxt ecosystem packages"
      icon="i-lucide-git-branch"
    >
      <template #links>
        <div class="flex items-center gap-2 text-sm text-muted">
          <UIcon name="i-lucide-refresh-cw" class="size-4" />
          <span>Last synced: {{ lastSyncedFormatted }}</span>
        </div>
      </template>
    </UPageHeader>

    <UPageBody>
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <UCard class="text-center">
          <div class="text-2xl font-bold text-error">{{ releaseStats.critical }}</div>
          <div class="text-sm text-muted">Critical</div>
        </UCard>
        <UCard class="text-center">
          <div class="text-2xl font-bold text-warning">{{ releaseStats.notable }}</div>
          <div class="text-sm text-muted">Notable</div>
        </UCard>
        <UCard class="text-center">
          <div class="text-2xl font-bold text-neutral">{{ releaseStats.minor }}</div>
          <div class="text-sm text-muted">Minor</div>
        </UCard>
      </div>

      <!-- Filters -->
      <UCard class="mb-8">
        <div class="space-y-4">
          <!-- Package Filter -->
          <ChangelogPackageFilter
            v-if="packagesData?.packages"
            v-model="selectedPackages"
            :packages="packagesData.packages"
          />

          <USeparator />

          <!-- Importance Filter -->
          <div class="flex items-center gap-4">
            <span class="text-sm font-medium">Importance:</span>
            <div class="flex gap-2">
              <UButton
                v-for="option in importanceOptions"
                :key="option.value ?? 'all'"
                size="xs"
                :variant="selectedImportance === option.value ? 'solid' : 'outline'"
                :color="selectedImportance === option.value ? 'primary' : 'neutral'"
                @click="selectedImportance = option.value"
              >
                {{ option.label }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Loading -->
      <div
        v-if="pending"
        class="space-y-4"
      >
        <USkeleton
          v-for="i in 5"
          :key="i"
          class="h-48 w-full"
        />
      </div>

      <!-- Release List -->
      <div
        v-else-if="changelogData?.releases?.length"
        class="space-y-4"
      >
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm text-muted">
            Showing {{ changelogData.releases.length }} of {{ changelogData.total }} releases
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            icon="i-lucide-refresh-cw"
            @click="() => refresh()"
          >
            Refresh
          </UButton>
        </div>

        <ChangelogReleaseCard
          v-for="release in changelogData.releases"
          :key="release.id"
          :release="release"
        />
      </div>

      <!-- Empty State -->
      <UCard v-else>
        <div class="text-center py-12">
          <UIcon
            name="i-lucide-inbox"
            class="size-12 text-muted mx-auto mb-4"
          />
          <h3 class="text-lg font-medium mb-2">No releases found</h3>
          <p class="text-muted text-sm mb-4">
            {{ selectedPackages.length > 0 || selectedImportance
              ? 'Try adjusting your filters'
              : 'Run the sync script to fetch releases'
            }}
          </p>
          <UButton
            v-if="selectedPackages.length > 0 || selectedImportance"
            variant="outline"
            @click="selectedPackages = []; selectedImportance = null"
          >
            Clear Filters
          </UButton>
        </div>
      </UCard>
    </UPageBody>
  </UPage>
</template>
