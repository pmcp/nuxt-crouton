<script setup lang="ts">
import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

const props = defineProps<{
  selectedIds: string[]
  decisions: ThinkgraphDecision[]
}>()

const emit = defineEmits<{
  synthesize: []
  'generate-brief': [format: string]
  'copy-context': []
  dispatch: []
  clear: []
  deselect: [id: string]
}>()

const selectedDecisions = computed(() =>
  props.selectedIds
    .map(id => props.decisions.find(d => d.id === id))
    .filter(Boolean) as ThinkgraphDecision[]
)

const visibleChips = computed(() => selectedDecisions.value.slice(0, 3))
const overflowCount = computed(() => Math.max(0, selectedDecisions.value.length - 3))

function truncate(text: string, max = 30) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

const briefFormats = [
  [
    { label: 'Markdown', icon: 'i-lucide-file-text', onSelect: () => emit('generate-brief', 'markdown') },
    { label: 'AI Prompt', icon: 'i-lucide-sparkles', onSelect: () => emit('generate-brief', 'ai-prompt') },
    { label: 'Dev Brief', icon: 'i-lucide-code', onSelect: () => emit('generate-brief', 'dev-brief') },
  ],
]
</script>

<template>
  <Transition name="slide-up">
    <div v-if="selectedIds.length >= 2" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div class="flex items-center gap-3 px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow-xl">
        <!-- Count badge -->
        <span class="flex items-center justify-center size-7 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-semibold">
          {{ selectedIds.length }}
        </span>

        <!-- Node chips -->
        <div class="flex items-center gap-1.5">
          <span
            v-for="d in visibleChips"
            :key="d.id"
            class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
          >
            {{ truncate(d.content) }}
            <button
              class="hover:text-red-500 transition-colors cursor-pointer"
              @click="emit('deselect', d.id)"
            >
              <UIcon name="i-lucide-x" class="size-3" />
            </button>
          </span>
          <span v-if="overflowCount > 0" class="text-xs text-neutral-400">
            +{{ overflowCount }} more
          </span>
        </div>

        <!-- Separator -->
        <div class="w-px h-6 bg-neutral-200 dark:bg-neutral-700" />

        <!-- Actions -->
        <div class="flex items-center gap-1.5">
          <UButton
            icon="i-lucide-git-merge"
            label="Synthesize"
            size="sm"
            variant="soft"
            color="primary"
            @click="emit('synthesize')"
          />
          <UDropdownMenu :items="briefFormats">
            <UButton
              icon="i-lucide-file-text"
              label="Brief"
              size="sm"
              variant="soft"
              color="neutral"
            />
          </UDropdownMenu>
          <UButton
            icon="i-lucide-send"
            label="Send to..."
            size="sm"
            variant="soft"
            color="neutral"
            @click="emit('dispatch')"
          />
          <UButton
            icon="i-lucide-copy"
            size="sm"
            variant="ghost"
            color="neutral"
            title="Copy context"
            @click="emit('copy-context')"
          />
          <UButton
            icon="i-lucide-x"
            size="sm"
            variant="ghost"
            color="neutral"
            title="Clear selection"
            @click="emit('clear')"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px);
}
</style>
