<script setup lang="ts">
import type { Block } from '../types/blocks'

interface Props {
  block: Block
  selected?: boolean
  dimmed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  dimmed: false
})

const emit = defineEmits<{
  select: [block: Block]
  remove: [blockId: string]
}>()

const packageLabel = computed(() =>
  props.block.package.replace('crouton-', '')
)
</script>

<template>
  <div
    class="kanban-card group relative rounded-lg border border-default bg-default p-3 cursor-grab active:cursor-grabbing transition-all duration-150"
    :class="{
      'opacity-40 pointer-events-none': dimmed,
      'ring-2 ring-primary': selected,
      'hover:shadow-md hover:-translate-y-0.5': !dimmed
    }"
    @click="emit('select', block)"
  >
    <div class="flex items-start gap-3">
      <div class="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
        <UIcon :name="block.icon" class="w-4 h-4 text-primary" />
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm truncate">{{ block.label }}</div>
        <div class="text-xs text-muted mt-0.5 line-clamp-1">{{ block.description }}</div>
      </div>
    </div>

    <div class="flex items-center gap-1.5 mt-2">
      <UBadge variant="subtle" color="neutral" size="xs">
        {{ packageLabel }}
      </UBadge>
      <UBadge
        v-if="block.collections.length > 0"
        variant="subtle"
        color="primary"
        size="xs"
      >
        {{ block.collections.length }} {{ block.collections.length === 1 ? 'collection' : 'collections' }}
      </UBadge>
    </div>

    <!-- Remove button (hover) -->
    <button
      class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-error/10 text-error opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-error/20"
      @click.stop="emit('remove', block.id)"
    >
      <UIcon name="i-lucide-x" class="w-3 h-3" />
    </button>
  </div>
</template>
