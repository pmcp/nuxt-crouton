<!--
  @crouton-generated
  @collection tasks
  @layer project-management
  @generated 2025-12-21

  ## AI Context
  - Card component for tasks collection
  - Renders in list, grid, and cards layouts
  - Props: item (ProjectManagementTask), layout, collection
  - Uses Nuxt UI 4 components
-->

<script setup lang="ts">
import type { ProjectManagementTask } from '../../types'

interface Props {
  item: ProjectManagementTask
  layout: 'list' | 'grid' | 'cards'
  collection: string
}

const props = defineProps<Props>()

const { open: openCrouton } = useCrouton()
const { t } = useEntityTranslations()

const priorityColors: Record<string, string> = {
  urgent: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  high: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
  medium: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  low: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800'
}

const statusColors: Record<string, string> = {
  todo: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  in_progress: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  review: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30',
  done: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  blocked: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30'
}

const handleEdit = () => {
  openCrouton('update', props.collection, props.item)
}

const isPastDue = computed(() => {
  if (!props.item.dueDate) return false
  return new Date(props.item.dueDate) < new Date()
})
</script>

<template>
  <!-- List Layout -->
  <div
    v-if="layout === 'list'"
    class="flex items-center justify-between gap-4 cursor-pointer"
    @click="handleEdit"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div class="shrink-0">
        <UIcon
          v-if="item.isCompleted"
          name="i-heroicons-check-circle-solid"
          class="w-5 h-5 text-emerald-500"
        />
        <div
          v-else
          class="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"
        />
      </div>
      <div class="min-w-0">
        <div
          class="font-medium truncate"
          :class="item.isCompleted ? 'text-muted line-through' : 'text-default'"
        >
          {{ t(item, 'title') }}
        </div>
        <div
          v-if="item.description"
          class="text-sm text-muted truncate"
        >
          {{ t(item, 'description') }}
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2 shrink-0">
      <span
        v-if="item.priority"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="priorityColors[item.priority] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.priority }}
      </span>
      <span
        v-if="item.status"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.status }}
      </span>
      <span
        v-if="item.dueDate"
        class="text-xs"
        :class="isPastDue && !item.isCompleted ? 'text-red-500' : 'text-muted'"
      >
        <CroutonDate :date="item.dueDate" />
      </span>
    </div>
  </div>

  <!-- Grid Layout -->
  <div
    v-else-if="layout === 'grid'"
    class="group relative p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    :class="{ 'opacity-60': item.isCompleted }"
    @click="handleEdit"
  >
    <div class="flex items-start gap-2 mb-2">
      <UIcon
        v-if="item.isCompleted"
        name="i-heroicons-check-circle-solid"
        class="w-5 h-5 text-emerald-500 shrink-0 mt-0.5"
      />
      <h3
        class="font-medium line-clamp-2"
        :class="item.isCompleted ? 'text-muted line-through' : 'text-default'"
      >
        {{ t(item, 'title') }}
      </h3>
    </div>
    <p
      v-if="item.description"
      class="text-sm text-muted line-clamp-2 mb-2"
    >
      {{ t(item, 'description') }}
    </p>
    <div class="flex items-center gap-2 flex-wrap">
      <span
        v-if="item.priority"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="priorityColors[item.priority] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.priority }}
      </span>
      <span
        v-if="item.status"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.status }}
      </span>
      <span
        v-if="item.estimatedHours"
        class="text-xs text-muted"
      >
        {{ item.estimatedHours }}h
      </span>
    </div>
  </div>

  <!-- Cards Layout -->
  <div
    v-else-if="layout === 'cards'"
    class="group relative bg-default border border-default rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    :class="{ 'opacity-60': item.isCompleted }"
    @click="handleEdit"
  >
    <div
      class="h-1.5"
      :class="{
        'bg-red-500': item.priority === 'urgent',
        'bg-orange-500': item.priority === 'high',
        'bg-amber-500': item.priority === 'medium',
        'bg-gray-300 dark:bg-gray-600': !item.priority || item.priority === 'low'
      }"
    />
    <div class="p-5">
      <div class="flex items-start gap-3 mb-3">
        <UIcon
          v-if="item.isCompleted"
          name="i-heroicons-check-circle-solid"
          class="w-6 h-6 text-emerald-500 shrink-0"
        />
        <div
          v-else
          class="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0"
        />
        <h3
          class="font-semibold text-lg line-clamp-2"
          :class="item.isCompleted ? 'text-muted line-through' : 'text-default'"
        >
          {{ t(item, 'title') }}
        </h3>
      </div>
      <p
        v-if="item.description"
        class="text-sm text-muted line-clamp-3 mb-4"
      >
        {{ t(item, 'description') }}
      </p>
      <div class="flex items-center gap-2 mb-3 flex-wrap">
        <span
          v-if="item.priority"
          class="text-xs px-2.5 py-1 rounded-full"
          :class="priorityColors[item.priority] || 'bg-gray-100 text-gray-600'"
        >
          {{ item.priority }}
        </span>
        <span
          v-if="item.status"
          class="text-xs px-2.5 py-1 rounded-full"
          :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
        >
          {{ item.status }}
        </span>
      </div>
      <div class="flex items-center justify-between text-sm text-muted pt-3 border-t border-default">
        <div class="flex items-center gap-1">
          <UIcon
            name="i-heroicons-calendar"
            class="w-4 h-4"
          />
          <span
            :class="isPastDue && !item.isCompleted ? 'text-red-500' : ''"
          >
            <span v-if="item.dueDate">
              <CroutonDate :date="item.dueDate" />
            </span>
            <span v-else>No due date</span>
          </span>
        </div>
        <div
          v-if="item.estimatedHours"
          class="flex items-center gap-1"
        >
          <UIcon
            name="i-heroicons-clock"
            class="w-4 h-4"
          />
          <span>{{ item.estimatedHours }}h</span>
        </div>
      </div>
    </div>
  </div>
</template>