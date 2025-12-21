<!--
  @crouton-generated
  @collection projects
  @layer project-management
  @generated 2025-12-21

  ## AI Context
  - Card component for projects collection
  - Renders in list, grid, and cards layouts
  - Props: item (ProjectManagementProject), layout, collection
  - Uses Nuxt UI 4 components
-->

<script setup lang="ts">
import type { ProjectManagementProject } from '../../types'

interface Props {
  item: ProjectManagementProject
  layout: 'list' | 'grid' | 'cards'
  collection: string
}

const props = defineProps<Props>()

const { open: openCrouton } = useCrouton()
const { t } = useEntityTranslations()

const statusColors: Record<string, string> = {
  active: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30',
  planning: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
  on_hold: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30',
  completed: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800',
  archived: 'text-gray-500 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'
}

const handleEdit = () => {
  openCrouton('update', props.collection, props.item)
}
</script>

<template>
  <!-- List Layout -->
  <div
    v-if="layout === 'list'"
    class="flex items-center justify-between gap-4 cursor-pointer"
    @click="handleEdit"
  >
    <div class="flex items-center gap-3 min-w-0">
      <div
        v-if="item.color"
        class="w-3 h-3 rounded-full shrink-0"
        :style="{ backgroundColor: item.color }"
      />
      <div
        v-else
        class="w-3 h-3 rounded-full shrink-0 bg-gray-300 dark:bg-gray-600"
      />
      <div class="min-w-0">
        <div class="font-medium text-default truncate">
          {{ t(item, 'name') }}
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
        v-if="item.status"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.status }}
      </span>
      <span
        v-if="item.dueDate"
        class="text-xs text-muted"
      >
        <CroutonDate :date="item.dueDate" />
      </span>
      <UIcon
        v-if="item.isPublic"
        name="i-heroicons-globe-alt"
        class="w-4 h-4 text-muted"
      />
    </div>
  </div>

  <!-- Grid Layout -->
  <div
    v-else-if="layout === 'grid'"
    class="group relative p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
    @click="handleEdit"
  >
    <div class="flex items-start gap-2 mb-2">
      <div
        v-if="item.color"
        class="w-2 h-2 rounded-full mt-1.5 shrink-0"
        :style="{ backgroundColor: item.color }"
      />
      <h3 class="font-medium text-default line-clamp-2">
        {{ t(item, 'name') }}
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
        v-if="item.status"
        class="text-xs px-2 py-0.5 rounded-full"
        :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
      >
        {{ item.status }}
      </span>
      <UIcon
        v-if="item.isPublic"
        name="i-heroicons-globe-alt"
        class="w-3 h-3 text-muted"
      />
    </div>
  </div>

  <!-- Cards Layout -->
  <div
    v-else-if="layout === 'cards'"
    class="group relative bg-default border border-default rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
    @click="handleEdit"
  >
    <div
      v-if="item.color"
      class="h-1.5"
      :style="{ backgroundColor: item.color }"
    />
    <div class="p-5">
      <div class="flex items-start justify-between mb-3">
        <h3 class="font-semibold text-lg text-default line-clamp-2 pr-2">
          {{ t(item, 'name') }}
        </h3>
        <span
          v-if="item.status"
          class="text-xs px-2.5 py-1 rounded-full shrink-0"
          :class="statusColors[item.status] || 'bg-gray-100 text-gray-600'"
        >
          {{ item.status }}
        </span>
      </div>
      <p
        v-if="item.description"
        class="text-sm text-muted line-clamp-3 mb-4"
      >
        {{ t(item, 'description') }}
      </p>
      <div class="flex items-center justify-between text-sm text-muted pt-3 border-t border-default">
        <div class="flex items-center gap-1">
          <UIcon
            name="i-heroicons-calendar"
            class="w-4 h-4"
          />
          <span v-if="item.dueDate">
            <CroutonDate :date="item.dueDate" />
          </span>
          <span v-else>No due date</span>
        </div>
        <div class="flex items-center gap-2">
          <UIcon
            v-if="item.isPublic"
            name="i-heroicons-globe-alt"
            class="w-4 h-4"
          />
          <UIcon
            v-else
            name="i-heroicons-lock-closed"
            class="w-4 h-4"
          />
        </div>
      </div>
    </div>
  </div>
</template>