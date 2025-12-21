<script setup lang="ts">
import type { ChangelogPackage } from '~~/shared/types/changelog'

const props = defineProps<{
  packages: ChangelogPackage[]
}>()

const selected = defineModel<string[]>({ default: () => [] })

const packageOptions = computed(() =>
  props.packages.map(pkg => ({
    label: pkg.name,
    value: pkg.name,
    priority: pkg.priority
  }))
)

type PackageOption = { label: string, value: string, priority: 'critical' | 'high' | 'medium' }

const priorityGroups = computed(() => {
  const groups: Record<'critical' | 'high' | 'medium', PackageOption[]> = {
    critical: [],
    high: [],
    medium: []
  }

  for (const pkg of packageOptions.value) {
    groups[pkg.priority as 'critical' | 'high' | 'medium'].push(pkg)
  }

  return groups
})

function togglePackage(name: string) {
  if (selected.value.includes(name)) {
    selected.value = selected.value.filter(n => n !== name)
  }
  else {
    selected.value = [...selected.value, name]
  }
}

function clearAll() {
  selected.value = []
}

function selectPriority(priority: 'critical' | 'high' | 'medium') {
  const names = priorityGroups.value[priority].map(p => p.value)
  const allSelected = names.every(n => selected.value.includes(n))

  if (allSelected) {
    selected.value = selected.value.filter(n => !names.includes(n))
  }
  else {
    selected.value = [...new Set([...selected.value, ...names])]
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">Filter by Package</span>
      <UButton
        v-if="selected.length > 0"
        variant="link"
        color="neutral"
        size="xs"
        @click="clearAll"
      >
        Clear ({{ selected.length }})
      </UButton>
    </div>

    <div class="flex flex-wrap gap-2">
      <!-- Quick filters by priority -->
      <UButton
        size="xs"
        :variant="priorityGroups.critical.every(p => selected.includes(p.value)) ? 'solid' : 'outline'"
        color="error"
        @click="selectPriority('critical')"
      >
        Critical ({{ priorityGroups.critical.length }})
      </UButton>
      <UButton
        size="xs"
        :variant="priorityGroups.high.every(p => selected.includes(p.value)) ? 'solid' : 'outline'"
        color="warning"
        @click="selectPriority('high')"
      >
        High ({{ priorityGroups.high.length }})
      </UButton>
      <UButton
        size="xs"
        :variant="priorityGroups.medium.every(p => selected.includes(p.value)) ? 'solid' : 'outline'"
        color="neutral"
        @click="selectPriority('medium')"
      >
        Medium ({{ priorityGroups.medium.length }})
      </UButton>
    </div>

    <USeparator />

    <div class="flex flex-wrap gap-1.5">
      <UButton
        v-for="pkg in packageOptions"
        :key="pkg.value"
        size="xs"
        :variant="selected.includes(pkg.value) ? 'solid' : 'outline'"
        :color="selected.includes(pkg.value) ? 'primary' : 'neutral'"
        @click="togglePackage(pkg.value)"
      >
        {{ pkg.label }}
      </UButton>
    </div>
  </div>
</template>
