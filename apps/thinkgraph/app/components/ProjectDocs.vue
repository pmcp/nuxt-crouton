<script setup lang="ts">
import { TEMPLATE_CONFIG } from '~/utils/thinkgraph-config'

const props = defineProps<{
  workItems: Array<{
    id: string
    title: string
    template?: string
    summary?: string
    brief?: string
    output?: string
  }>
  searchQuery: string
}>()

const TEMPLATE_LABELS: Record<string, string> = {
  feature: 'Shipped Features',
  task: 'Completed Tasks',
  research: 'Research Findings',
  idea: 'Explored Ideas',
  meta: 'Meta & Planning',
}

const GROUP_ORDER = ['feature', 'task', 'research', 'idea', 'meta']

const groupedItems = computed(() => {
  const groups = new Map<string, typeof props.workItems>()
  for (const item of props.workItems) {
    const key = item.template || 'idea'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  return GROUP_ORDER
    .filter(t => groups.has(t))
    .map(t => ({
      template: t,
      label: TEMPLATE_LABELS[t] || t,
      icon: TEMPLATE_CONFIG[t]?.icon || 'i-lucide-circle',
      color: TEMPLATE_CONFIG[t]?.color || 'text-neutral-500',
      items: groups.get(t)!,
    }))
})
</script>

<template>
  <div v-if="!workItems.length" class="text-center py-12">
    <UIcon name="i-lucide-file-text" class="size-8 text-neutral-300 mb-3" />
    <p class="text-muted">No completed work to show yet.</p>
  </div>

  <div v-else class="space-y-12">
    <section v-for="group in groupedItems" :key="group.template">
      <!-- Group heading -->
      <div class="flex items-center gap-2 mb-6 pb-2 border-b border-neutral-200 dark:border-neutral-700">
        <UIcon :name="group.icon" class="size-5" :class="group.color" />
        <h2 class="text-lg font-semibold">{{ group.label }}</h2>
        <span class="text-xs text-muted">({{ group.items.length }})</span>
      </div>

      <!-- Items -->
      <article
        v-for="item in group.items"
        :key="item.id"
        class="mb-8 last:mb-0"
      >
        <h3 class="text-base font-semibold mb-1">{{ item.title }}</h3>
        <p v-if="item.summary" class="text-sm text-muted mb-3 italic">{{ item.summary }}</p>
        <div class="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm leading-relaxed">{{ item.output }}</div>
      </article>
    </section>
  </div>
</template>
