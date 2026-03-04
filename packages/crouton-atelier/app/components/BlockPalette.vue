<script setup lang="ts">
import type { BlockCategory } from '../types/blocks'
import { blocksByCategory, blockCategories } from '../composables/useBlockRegistry'

interface Props {
  selectedBlockIds: string[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [blockId: string]
  close: []
}>()


const categoryLabels: Record<BlockCategory, { label: string, icon: string }> = {
  content: { label: 'Content', icon: 'i-lucide-file-text' },
  data: { label: 'Data', icon: 'i-lucide-database' },
  interaction: { label: 'Interaction', icon: 'i-lucide-mouse-pointer-click' },
  member: { label: 'Member', icon: 'i-lucide-user' },
  admin: { label: 'Admin', icon: 'i-lucide-shield' }
}

function isSelected(blockId: string): boolean {
  return props.selectedBlockIds.includes(blockId)
}

function handleAdd(blockId: string) {
  if (isSelected(blockId)) return
  emit('add', blockId)
}
</script>

<template>
  <div class="block-palette">
    <div class="flex items-center justify-between px-4 py-3 border-b border-default">
      <h3 class="font-semibold text-base">Add Block</h3>
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        class="md:hidden"
        @click="emit('close')"
      />
    </div>

    <div class="p-3 space-y-4 overflow-y-auto max-h-[70vh] md:max-h-none">
      <div v-for="cat in blockCategories" :key="cat">
        <div class="flex items-center gap-2 mb-2 px-1">
          <UIcon :name="categoryLabels[cat]?.icon ?? 'i-lucide-folder'" class="w-3.5 h-3.5 text-muted" />
          <span class="text-xs font-medium text-muted uppercase tracking-wider">
            {{ categoryLabels[cat]?.label ?? cat }}
          </span>
        </div>

        <div class="space-y-1.5">
          <button
            v-for="block in blocksByCategory.get(cat)"
            :key="block.id"
            class="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all duration-150"
            :class="isSelected(block.id)
              ? 'bg-muted/50 opacity-40 cursor-not-allowed'
              : 'hover:bg-muted/50 active:scale-[0.98] cursor-pointer'"
            :disabled="isSelected(block.id)"
            @click="handleAdd(block.id)"
          >
            <div class="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <UIcon :name="block.icon" class="w-4 h-4 text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ block.label }}</div>
              <div class="text-xs text-muted truncate">{{ block.description }}</div>
            </div>
            <UIcon
              v-if="isSelected(block.id)"
              name="i-lucide-check"
              class="w-4 h-4 text-success shrink-0"
            />
            <UIcon
              v-else
              name="i-lucide-plus"
              class="w-4 h-4 text-muted shrink-0"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
