<script setup lang="ts">
const { state, setCardTemplate } = useSchemaDesigner()
const { compilationError } = useCompiledCard()

// Debounced update to avoid too many state changes
const debouncedUpdate = useDebounceFn((value: string) => {
  setCardTemplate(value)
}, 300)

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  debouncedUpdate(target.value)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="p-4 border-b border-[var(--ui-border)] flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-code" class="text-lg" />
        <h2 class="font-semibold">Card Template</h2>
      </div>
      <UBadge color="neutral" variant="subtle" size="xs">
        Card.vue
      </UBadge>
    </div>

    <!-- Info banner -->
    <div class="px-4 py-2 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)]">
      <p>
        Available props: <code class="bg-[var(--ui-bg)] px-1 rounded">item</code>,
        <code class="bg-[var(--ui-bg)] px-1 rounded">layout</code> ('list' | 'grid' | 'cards'),
        <code class="bg-[var(--ui-bg)] px-1 rounded">collection</code>
      </p>
    </div>

    <!-- Code Editor -->
    <div class="flex-1 overflow-hidden relative">
      <textarea
        :value="state.cardTemplate"
        class="w-full h-full p-4 font-mono text-sm bg-[var(--ui-bg)] text-[var(--ui-text)]
               border-none outline-none resize-none leading-relaxed"
        spellcheck="false"
        placeholder="Enter your Vue template code here..."
        @input="handleInput"
      />
    </div>

    <!-- Compilation Error Banner -->
    <div
      v-if="compilationError"
      class="px-4 py-2 bg-red-500/10 border-t border-red-500/20 flex items-center gap-2"
    >
      <UIcon name="i-lucide-alert-circle" class="text-red-500 shrink-0" />
      <span class="text-xs text-red-600 dark:text-red-400 break-all">{{ compilationError }}</span>
    </div>

    <!-- Success Indicator (when template compiles successfully) -->
    <div
      v-else-if="state.cardTemplate?.trim()"
      class="px-4 py-2 bg-green-500/10 border-t border-green-500/20 flex items-center gap-2"
    >
      <UIcon name="i-lucide-check-circle" class="text-green-500" />
      <span class="text-xs text-green-600 dark:text-green-400">Template compiles successfully</span>
    </div>

    <!-- Footer -->
    <div class="p-3 border-t border-[var(--ui-border)] text-xs text-[var(--ui-text-muted)]">
      <div class="flex items-center justify-between">
        <span>Template will be used for list, grid, and cards layouts</span>
        <span>{{ state.cardTemplate?.length || 0 }} chars</span>
      </div>
    </div>
  </div>
</template>
