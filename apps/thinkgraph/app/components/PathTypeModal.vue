<script setup lang="ts">
const props = defineProps<{
  nodeTitle?: string
}>()

const emit = defineEmits<{
  select: [pathType: string, method: string]
  close: []
}>()

const selectedPath = ref<string | null>(null)

const pathTypes = [
  {
    value: 'diverge',
    label: 'Diverge',
    icon: 'i-lucide-git-branch-plus',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800',
    description: 'Generate many different approaches',
    prompt: 'Generate 5-10 different approaches',
  },
  {
    value: 'deep_dive',
    label: 'Deep Dive',
    icon: 'i-lucide-microscope',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
    description: 'Explore one idea in depth',
    prompt: 'Go deep — implications, edge cases, trade-offs',
  },
  {
    value: 'prototype',
    label: 'Prototype',
    icon: 'i-lucide-hammer',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    description: 'Make it real and practical',
    prompt: 'Create a working prototype — be specific',
  },
  {
    value: 'converge',
    label: 'Converge',
    icon: 'i-lucide-git-merge',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
    description: 'Synthesize insights into one approach',
    prompt: 'Synthesize into a unified approach',
  },
  {
    value: 'validate',
    label: 'Validate',
    icon: 'i-lucide-shield-question',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    description: 'Stress-test and challenge assumptions',
    prompt: 'Challenge this — find holes and weaknesses',
  },
  {
    value: 'park',
    label: 'Park',
    icon: 'i-lucide-archive',
    color: 'text-neutral-400',
    bg: 'bg-neutral-50 dark:bg-neutral-950/20 border-neutral-200 dark:border-neutral-800',
    description: 'Save for later, not now',
    prompt: '',
  },
]

const methods = [
  { value: 'claude_code', label: 'Claude Code', icon: 'i-lucide-terminal' },
  { value: 'copy', label: 'Copy Context', icon: 'i-lucide-copy' },
  { value: 'claude', label: 'Claude', icon: 'i-simple-icons-anthropic' },
  { value: 'chatgpt', label: 'ChatGPT', icon: 'i-simple-icons-openai' },
  { value: 'gemini', label: 'Gemini', icon: 'i-simple-icons-google' },
]

function selectMethod(method: string) {
  if (!selectedPath.value) return
  emit('select', selectedPath.value, method)
}

function selectPark() {
  emit('select', 'park', 'none')
}
</script>

<template>
  <div class="p-5 max-w-lg">
    <h3 class="text-lg font-semibold mb-1">What kind of path?</h3>
    <p v-if="nodeTitle" class="text-sm text-muted mb-4 truncate">
      From: {{ nodeTitle }}
    </p>
    <p v-else class="text-sm text-muted mb-4">Choose a thinking direction</p>

    <!-- Step 1: Path type selection -->
    <div v-if="!selectedPath" class="grid grid-cols-2 gap-2">
      <button
        v-for="pt in pathTypes"
        :key="pt.value"
        class="flex items-start gap-3 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
        :class="pt.bg"
        @click="pt.value === 'park' ? selectPark() : (selectedPath = pt.value)"
      >
        <UIcon :name="pt.icon" class="size-5 mt-0.5 shrink-0" :class="pt.color" />
        <div>
          <p class="font-medium text-sm">{{ pt.label }}</p>
          <p class="text-xs text-muted mt-0.5">{{ pt.description }}</p>
        </div>
      </button>
    </div>

    <!-- Step 2: Method selection -->
    <div v-else>
      <div class="flex items-center gap-2 mb-4">
        <button
          class="text-xs text-muted hover:text-default transition-colors"
          @click="selectedPath = null"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
        </button>
        <span class="text-sm font-medium">
          {{ pathTypes.find(p => p.value === selectedPath)?.label }} — choose method
        </span>
      </div>

      <div class="flex flex-col gap-2">
        <button
          v-for="m in methods"
          :key="m.value"
          class="flex items-center gap-3 px-4 py-3 rounded-xl border border-default hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
          @click="selectMethod(m.value)"
        >
          <UIcon :name="m.icon" class="size-5 shrink-0" />
          <span class="text-sm font-medium">{{ m.label }}</span>
        </button>
      </div>
    </div>

    <!-- Cancel -->
    <div class="flex justify-end mt-4 pt-3 border-t border-default">
      <UButton variant="ghost" color="neutral" size="sm" @click="emit('close')">
        Cancel
      </UButton>
    </div>
  </div>
</template>
