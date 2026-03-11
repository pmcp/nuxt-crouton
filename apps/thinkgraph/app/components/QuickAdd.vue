<script setup lang="ts">
const props = defineProps<{
  parentId?: string
}>()

const emit = defineEmits<{
  added: []
}>()

const { parse } = useDecisionParser()
const { create } = useCollectionMutation('thinkgraphDecisions')
const { close } = useCrouton()

const input = ref('')
const parsed = computed(() => input.value.trim() ? parse(input.value) : [])
const adding = ref(false)
const selectedIndices = ref<Set<number>>(new Set())

// Auto-select high-confidence items
watch(parsed, (items) => {
  const selected = new Set<number>()
  items.forEach((item, i) => {
    if (item.confidence >= 0.7) selected.add(i)
  })
  selectedIndices.value = selected
})

function toggleItem(index: number) {
  const s = new Set(selectedIndices.value)
  if (s.has(index)) s.delete(index)
  else s.add(index)
  selectedIndices.value = s
}

async function addSelected() {
  adding.value = true
  try {
    const selected = parsed.value.filter((_, i) => selectedIndices.value.has(i))
    for (const item of selected) {
      await create({
        content: item.content,
        nodeType: item.nodeType,
        pathType: item.pathType,
        parentId: props.parentId || '',
        source: 'paste',
        starred: false,
        branchName: '',
        versionTag: '',
        model: '',
      })
    }
    input.value = ''
    emit('added')
    close()
  } finally {
    adding.value = false
  }
}

const confidenceColor = (c: number) => {
  if (c >= 0.8) return 'text-emerald-500'
  if (c >= 0.5) return 'text-amber-500'
  return 'text-neutral-400'
}

const nodeTypeIcon: Record<string, string> = {
  decision: 'i-lucide-check-circle',
  idea: 'i-lucide-lightbulb',
  question: 'i-lucide-help-circle',
  observation: 'i-lucide-eye',
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4 max-h-[80vh]">
    <div>
      <h3 class="text-lg font-semibold mb-1">Quick Add</h3>
      <p class="text-sm text-neutral-500">Paste AI output to extract decisions and insights.</p>
    </div>

    <UTextarea
      v-model="input"
      placeholder="Paste AI conversation output here...

Supports:
• DECISION: {&quot;content&quot;: &quot;...&quot;, &quot;nodeType&quot;: &quot;idea&quot;}
• Bullet points with Decision:/Insight:/Idea: prefixes
• Numbered lists with substantive content"
      :rows="6"
      autofocus
      class="w-full"
    />

    <!-- Parsed preview -->
    <div v-if="parsed.length" class="flex flex-col gap-1">
      <div class="flex items-center justify-between mb-1">
        <span class="text-sm font-medium">{{ parsed.length }} items found</span>
        <span class="text-xs text-neutral-400">{{ selectedIndices.size }} selected</span>
      </div>

      <div class="max-h-[300px] overflow-y-auto flex flex-col gap-1.5">
        <button
          v-for="(item, i) in parsed"
          :key="i"
          class="flex items-start gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer"
          :class="selectedIndices.has(i)
            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
            : 'border-neutral-200 dark:border-neutral-700 opacity-50'"
          @click="toggleItem(i)"
        >
          <UIcon
            :name="nodeTypeIcon[item.nodeType] || 'i-lucide-circle'"
            class="size-4 mt-0.5 shrink-0"
            :class="confidenceColor(item.confidence)"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm leading-snug">{{ item.content }}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                {{ item.nodeType }}
              </span>
              <span class="text-[10px]" :class="confidenceColor(item.confidence)">
                {{ Math.round(item.confidence * 100) }}%
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <div v-if="parsed.length" class="flex justify-end gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
      <UButton variant="ghost" color="neutral" @click="close()">Cancel</UButton>
      <UButton
        icon="i-lucide-plus"
        :label="`Add ${selectedIndices.size} items`"
        :loading="adding"
        :disabled="selectedIndices.size === 0"
        @click="addSelected"
      />
    </div>
  </div>
</template>
