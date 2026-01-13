<script setup lang="ts">
import type { PackageSummary } from '../../types/package-manifest'

interface Props {
  selectedPackageIds?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedPackageIds: () => []
})

const emit = defineEmits<{
  toggle: [packageId: string]
  select: [pkg: PackageSummary]
}>()

const { packages, loading, error, loadPackages, searchPackages } = usePackageRegistry()

const searchQuery = ref('')

const filteredPackages = computed(() => {
  return searchPackages(searchQuery.value)
})

function isSelected(packageId: string): boolean {
  return props.selectedPackageIds.includes(packageId)
}

function handleToggle(packageId: string) {
  emit('toggle', packageId)
}

function handleSelect(pkg: PackageSummary) {
  emit('select', pkg)
}

// Load packages on mount
onMounted(() => {
  loadPackages()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header with search -->
    <div class="flex items-center gap-4">
      <div class="flex-1">
        <UInput
          v-model="searchQuery"
          placeholder="Search packages..."
          icon="i-lucide-search"
          size="md"
          :disabled="loading"
        />
      </div>
      <UButton
        variant="ghost"
        color="neutral"
        size="md"
        :loading="loading"
        @click="loadPackages"
      >
        <template #leading>
          <UIcon name="i-lucide-refresh-cw" />
        </template>
        Refresh
      </UButton>
    </div>

    <!-- Error state -->
    <UAlert
      v-if="error"
      color="error"
      icon="i-lucide-alert-circle"
      title="Failed to load packages"
      :description="error"
    />

    <!-- Loading state -->
    <div
      v-else-if="loading && packages.length === 0"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="h-48 rounded-lg bg-[var(--ui-bg-elevated)] animate-pulse"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="filteredPackages.length === 0"
      class="text-center py-12"
    >
      <UIcon
        name="i-lucide-package-open"
        class="text-4xl text-[var(--ui-text-muted)] mb-4"
      />
      <p
        v-if="searchQuery"
        class="text-[var(--ui-text-muted)]"
      >
        No packages match "{{ searchQuery }}"
      </p>
      <p
        v-else
        class="text-[var(--ui-text-muted)]"
      >
        No packages available
      </p>
    </div>

    <!-- Package grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <SchemaDesignerPackageCard
        v-for="pkg in filteredPackages"
        :key="pkg.id"
        :package="pkg"
        :selected="isSelected(pkg.id)"
        @toggle="handleToggle"
        @click="handleSelect(pkg)"
      />
    </div>

    <!-- Summary -->
    <div
      v-if="!loading && packages.length > 0"
      class="text-sm text-[var(--ui-text-muted)]"
    >
      {{ filteredPackages.length }} of {{ packages.length }} packages
      <span v-if="selectedPackageIds.length > 0">
        &middot; {{ selectedPackageIds.length }} selected
      </span>
    </div>
  </div>
</template>
