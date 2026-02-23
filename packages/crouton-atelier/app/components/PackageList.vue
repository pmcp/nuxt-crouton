<script setup lang="ts">
import { blocks as allBlocks } from '../data/blocks'

interface Props {
  enabledPackages: string[]
  selectedBlockIds: string[]
}

const props = defineProps<Props>()

const packageIcons: Record<string, string> = {
  'crouton-bookings': 'i-lucide-calendar',
  'crouton-pages': 'i-lucide-file-text',
  'crouton-auth': 'i-lucide-shield'
}

const packageDetails = computed(() => {
  return props.enabledPackages.map((pkg) => {
    const blockCount = props.selectedBlockIds.filter((id) => {
      const block = allBlocks.find(b => b.id === id)
      return block?.package === pkg
    }).length

    return {
      name: pkg,
      label: pkg.replace('crouton-', ''),
      icon: packageIcons[pkg] ?? 'i-lucide-package',
      blockCount
    }
  })
})
</script>

<template>
  <div class="package-list">
    <div class="flex items-center gap-2 px-1 mb-2">
      <UIcon name="i-lucide-package" class="w-3.5 h-3.5 text-muted" />
      <span class="text-xs font-medium text-muted uppercase tracking-wider">Packages</span>
    </div>

    <div v-if="packageDetails.length > 0" class="space-y-1.5">
      <div
        v-for="pkg in packageDetails"
        :key="pkg.name"
        class="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-muted/30"
      >
        <UIcon :name="pkg.icon" class="w-4 h-4 text-primary shrink-0" />
        <span class="text-sm font-medium flex-1 capitalize">{{ pkg.label }}</span>
        <UBadge variant="subtle" color="neutral" size="xs">
          {{ pkg.blockCount }} {{ pkg.blockCount === 1 ? 'block' : 'blocks' }}
        </UBadge>
      </div>
    </div>

    <div
      v-else
      class="text-xs text-muted text-center py-3"
    >
      Add blocks to see required packages
    </div>
  </div>
</template>
