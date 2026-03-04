<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

defineProps<{
  data: Record<string, unknown>
  selected: boolean
  dragging: boolean
  label?: string
}>()

const pathTypeColors: Record<string, string> = {
  diverge: 'border-blue-400',
  'deep-dive': 'border-purple-400',
  prototype: 'border-orange-400',
  converge: 'border-green-400',
  validate: 'border-yellow-400',
  park: 'border-neutral-400'
}
</script>

<template>
  <div
    class="group relative px-3 py-2 rounded-lg border-2 bg-[var(--ui-bg)] shadow-sm cursor-pointer transition-all max-w-52"
    :class="[
      pathTypeColors[data.pathType as string] ?? 'border-[var(--ui-border)]',
      selected ? 'ring-2 ring-[var(--ui-primary)]' : '',
      data.starred ? 'bg-yellow-50 dark:bg-yellow-950/20' : ''
    ]"
  >
    <!-- Star indicator -->
    <UIcon
      v-if="data.starred"
      name="i-lucide-star"
      class="absolute top-1.5 right-1.5 size-3 text-yellow-400 fill-yellow-400"
    />

    <!-- Content -->
    <p class="text-xs font-medium text-[var(--ui-text-highlighted)] leading-snug line-clamp-3 pr-4">
      {{ data.content || data.title || 'Untitled' }}
    </p>

    <!-- Meta row -->
    <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
      <UBadge
        v-if="data.pathType"
        size="xs"
        :color="data.pathType === 'converge' ? 'success' : data.pathType === 'park' ? 'neutral' : 'primary'"
        variant="soft"
      >
        {{ data.pathType }}
      </UBadge>
      <span v-if="data.branchName && data.branchName !== 'main'" class="text-[10px] text-[var(--ui-text-muted)]">
        {{ data.branchName }}
      </span>
    </div>

    <!-- Vue Flow handles -->
    <Handle type="target" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
