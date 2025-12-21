<script setup lang="ts">
interface CollectionConfig {
  name?: string
  layer?: string
  apiPath?: string
  componentName?: string
  columns?: Array<{ accessorKey: string; header: string }>
  sortable?: { enabled: boolean; orderField?: string }
  hierarchy?: { enabled: boolean; parentField?: string }
}

interface Props {
  name: string
  config: CollectionConfig
  count?: number
}

const props = defineProps<Props>()
const { buildDashboardUrl } = useTeamContext()

const displayName = computed(() => {
  // Format collection name for display (e.g., blogPosts -> Blog Posts)
  return props.name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
})

const fieldCount = computed(() => props.config.columns?.length || 0)

const features = computed(() => {
  const list = []
  if (props.config.hierarchy?.enabled) {
    list.push({ label: 'Tree', icon: 'i-lucide-git-branch', color: 'info' as const })
  }
  if (props.config.sortable?.enabled) {
    list.push({ label: 'Sortable', icon: 'i-lucide-arrow-up-down', color: 'success' as const })
  }
  return list
})

const collectionUrl = computed(() => buildDashboardUrl(`/crouton/${props.name}`))
</script>

<template>
  <UCard class="hover:ring-2 hover:ring-primary-500/50 transition-all">
    <template #header>
      <div class="flex items-center justify-between">
        <NuxtLink
          :to="collectionUrl"
          class="font-semibold text-lg hover:text-primary-500 transition-colors"
        >
          {{ displayName }}
        </NuxtLink>
        <UBadge
          v-if="config.layer"
          :label="config.layer"
          color="primary"
          variant="soft"
          size="xs"
        />
      </div>
    </template>

    <div class="space-y-3">
      <!-- Stats -->
      <div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-database" class="w-4 h-4" />
          <span>{{ count ?? '—' }} items</span>
        </div>
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-columns" class="w-4 h-4" />
          <span>{{ fieldCount }} fields</span>
        </div>
      </div>

      <!-- API Path -->
      <div
        v-if="config.apiPath"
        class="text-xs font-mono text-gray-400 dark:text-gray-500 truncate"
      >
        /api/teams/[id]/{{ config.apiPath }}
      </div>

      <!-- Feature badges -->
      <div
        v-if="features.length"
        class="flex flex-wrap gap-1.5"
      >
        <CroutonSetupDashboardFeatureBadge
          v-for="feature in features"
          :key="feature.label"
          :label="feature.label"
          :icon="feature.icon"
          :color="feature.color"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          :to="collectionUrl"
          color="neutral"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-arrow-right"
        >
          View Collection
        </UButton>
      </div>
    </template>
  </UCard>
</template>
