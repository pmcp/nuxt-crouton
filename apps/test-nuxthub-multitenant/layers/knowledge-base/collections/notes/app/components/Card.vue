<!--
  @crouton-generated
  @collection notes
  @layer knowledge-base
  @generated 2025-12-21

  ## AI Context
  - Card component for notes collection
  - Renders in list, grid, and cards layouts
  - Props: item (KnowledgeBaseNote), layout, collection
  - Uses Nuxt UI 4 components
-->

<script setup lang="ts">
import type { KnowledgeBaseNote } from '../../types'

interface Props {
  item: KnowledgeBaseNote
  layout: 'list' | 'grid' | 'cards'
  collection: string
}

const props = defineProps<Props>()

const { open: openCrouton } = useCrouton()
const { t } = useEntityTranslations()

const categoryColors: Record<string, string> = {
  general: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  meeting: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  idea: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  reference: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  todo: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
}

const handleEdit = () => {
  openCrouton('update', props.collection, props.item)
}

// Extract tags as array if present
const tagsList = computed(() => {
  if (!props.item.tags) return []
  if (Array.isArray(props.item.tags)) return props.item.tags
  if (typeof props.item.tags === 'object') return Object.keys(props.item.tags)
  return []
})
</script>

<template>
  <!-- List Layout -->
  <div
    v-if="layout === 'list'"
    class="flex items-center justify-between gap-4 cursor-pointer"
    :class="{ 'opacity-50': item.isArchived }"
    @click="handleEdit"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div class="shrink-0">
        <UIcon
          v-if="item.isPinned"
          name="i-heroicons-star-solid"
          class="w-5 h-5 text-amber-500"
        />
        <UIcon
          v-else-if="item.isArchived"
          name="i-heroicons-archive-box"
          class="w-5 h-5 text-gray-400"
        />
        <UIcon
          v-else
          name="i-heroicons-document-text"
          class="w-5 h-5 text-gray-400"
        />
      </div>
      <div class="min-w-0">
        <div class="font-medium text-default truncate">
          {{ t(item, 'title') }}
        </div>
        <div
          v-if="item.content"
          class="text-sm text-muted truncate"
        >
          {{ t(item, 'content') }}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <span
        v-if="item.category"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="categoryColors[item.category] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.category }}
      </span>
      <span class="text-xs text-muted">
        <CroutonDate :date="item.updatedAt" />
      </span>
    </div>
  </div>

  <!-- Grid Layout -->
  <div
    v-else-if="layout === 'grid'"
    class="group relative p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    :class="{ 'opacity-50': item.isArchived }"
    @click="handleEdit"
  >
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="font-medium text-default line-clamp-2">
        {{ t(item, 'title') }}
      </h3>
      <UIcon
        v-if="item.isPinned"
        name="i-heroicons-star-solid"
        class="w-4 h-4 text-amber-500 shrink-0"
      />
    </div>
    <p
      v-if="item.content"
      class="text-sm text-muted line-clamp-2 mb-2"
    >
      {{ t(item, 'content') }}
    </p>
    <div class="flex items-center gap-2 flex-wrap">
      <span
        v-if="item.category"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="categoryColors[item.category] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.category }}
      </span>
      <span
        v-for="tag in tagsList.slice(0, 2)"
        :key="tag"
        class="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted"
      >
        {{ tag }}
      </span>
      <span
        v-if="tagsList.length > 2"
        class="text-xs text-muted"
      >
        +{{ tagsList.length - 2 }}
      </span>
    </div>
  </div>

  <!-- Cards Layout -->
  <div
    v-else-if="layout === 'cards'"
    class="group relative bg-default border border-default rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    :class="{ 'opacity-50': item.isArchived }"
    @click="handleEdit"
  >
    <div class="p-5">
      <div class="flex items-start justify-between mb-3">
        <div class="flex items-center gap-2">
          <UIcon
            v-if="item.isPinned"
            name="i-heroicons-star-solid"
            class="w-5 h-5 text-amber-500"
          />
          <UIcon
            v-else-if="item.isArchived"
            name="i-heroicons-archive-box"
            class="w-5 h-5 text-gray-400"
          />
          <h3 class="font-semibold text-lg text-default line-clamp-2">
            {{ t(item, 'title') }}
          </h3>
        </div>
        <span
          v-if="item.category"
          class="text-xs px-2.5 py-1 rounded-full shrink-0"
          :class="categoryColors[item.category] || 'bg-gray-100 text-gray-600'"
        >
          {{ item.category }}
        </span>
      </div>
      <p
        v-if="item.content"
        class="text-sm text-muted line-clamp-4 mb-4"
      >
        {{ t(item, 'content') }}
      </p>
      <div
        v-if="tagsList.length > 0"
        class="flex items-center gap-2 flex-wrap mb-4"
      >
        <span
          v-for="tag in tagsList.slice(0, 4)"
          :key="tag"
          class="text-xs px-2.5 py-1 rounded-full bg-muted/30 text-muted"
        >
          {{ tag }}
        </span>
        <span
          v-if="tagsList.length > 4"
          class="text-xs text-muted"
        >
          +{{ tagsList.length - 4 }} more
        </span>
      </div>
      <div class="flex items-center justify-between text-sm text-muted pt-3 border-t border-default">
        <div class="flex items-center gap-1">
          <UIcon
            name="i-heroicons-clock"
            class="w-4 h-4"
          />
          <span>
            <CroutonDate :date="item.updatedAt" />
          </span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            v-if="item.isArchived"
            name="i-heroicons-archive-box"
            class="w-4 h-4"
          />
        </div>
      </div>
    </div>
  </div>
</template>