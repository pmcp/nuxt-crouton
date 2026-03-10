<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    title: string
    properties: Record<string, unknown>
    url: string
    grouped: boolean
  }
  selected: boolean
}

const props = defineProps<Props>()

const statusValue = computed(() => {
  const p = props.data.properties
  return (p.Status || p.status) as string | null
})

const tagsValue = computed(() => {
  const p = props.data.properties
  const tags = (p.Tags || p.tags || p.Labels || p.labels) as string[] | null
  return tags?.slice(0, 3) || []
})
</script>

<template>
  <div
    class="notion-card-node"
    :class="{ selected, grouped: data.grouped }"
  >
    <Handle type="target" :position="Position.Top" class="!opacity-0" />

    <div class="card-title">
      {{ data.title }}
    </div>

    <div v-if="statusValue" class="card-status">
      {{ statusValue }}
    </div>

    <div v-if="tagsValue.length" class="card-tags">
      <span v-for="tag in tagsValue" :key="tag" class="card-tag">
        {{ tag }}
      </span>
    </div>

    <Handle type="source" :position="Position.Bottom" class="!opacity-0" />
  </div>
</template>

<style scoped>
.notion-card-node {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
  min-width: 180px;
  max-width: 240px;
  cursor: grab;
  transition: box-shadow 0.15s, border-color 0.15s;
  font-size: 13px;
}

.notion-card-node:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.notion-card-node.selected {
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.notion-card-node.grouped {
  border-left: 3px solid var(--color-primary-400, #60a5fa);
}

.card-title {
  font-weight: 500;
  color: #1f2937;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-status {
  margin-top: 6px;
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.card-tags {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.card-tag {
  font-size: 10px;
  color: #4b5563;
  background: #e5e7eb;
  padding: 1px 5px;
  border-radius: 3px;
}

/* Dark mode */
:root.dark .notion-card-node {
  background: #1f2937;
  border-color: #374151;
}

:root.dark .card-title {
  color: #f3f4f6;
}

:root.dark .card-status {
  background: #374151;
  color: #9ca3af;
}

:root.dark .card-tag {
  background: #374151;
  color: #9ca3af;
}
</style>
