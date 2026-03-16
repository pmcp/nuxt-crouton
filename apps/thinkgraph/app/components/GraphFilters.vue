<script setup lang="ts">
import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

const props = defineProps<{
  decisions: ThinkgraphDecision[]
}>()

const decisionsRef = computed(() => props.decisions)
const { filters, filteredIds, activeFilterCount, availableBranches, availableVersionTags, clearFilters } = useGraphFilters(decisionsRef)

const collapsed = ref(false)

const nodeTypes = [
  { id: 'idea', label: 'Idea', color: 'bg-emerald-500' },
  { id: 'insight', label: 'Insight', color: 'bg-blue-500' },
  { id: 'decision', label: 'Decision', color: 'bg-purple-500' },
  { id: 'question', label: 'Question', color: 'bg-amber-500' },
  { id: 'epic', label: 'Epic', color: 'bg-indigo-500' },
  { id: 'user_story', label: 'User Story', color: 'bg-cyan-500' },
  { id: 'task', label: 'Task', color: 'bg-teal-500' },
  { id: 'milestone', label: 'Milestone', color: 'bg-rose-500' },
  { id: 'remark', label: 'Remark', color: 'bg-neutral-500' },
  { id: 'fork', label: 'Fork', color: 'bg-orange-500' },
  { id: 'send', label: 'Send', color: 'bg-sky-500' },
]

const pathTypes = [
  { id: 'diverge', label: 'Diverge', icon: 'i-lucide-git-branch-plus' },
  { id: 'deep_dive', label: 'Deep dive', icon: 'i-lucide-microscope' },
  { id: 'prototype', label: 'Prototype', icon: 'i-lucide-hammer' },
  { id: 'converge', label: 'Converge', icon: 'i-lucide-git-merge' },
  { id: 'validate', label: 'Validate', icon: 'i-lucide-shield-question' },
  { id: 'park', label: 'Park', icon: 'i-lucide-archive' },
]

function toggleArrayFilter(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
}

defineExpose({ filteredIds })
</script>

<template>
  <div
    class="border-r border-neutral-200 dark:border-neutral-800 flex-shrink-0 flex flex-col h-full transition-all duration-200 overflow-hidden"
    :class="collapsed ? 'w-10' : 'w-[240px]'"
  >
    <!-- Collapsed state -->
    <div v-if="collapsed" class="flex flex-col items-center py-3 gap-2">
      <button
        class="relative cursor-pointer"
        @click="collapsed = false"
      >
        <UIcon name="i-lucide-filter" class="size-4 text-neutral-500" />
        <span
          v-if="activeFilterCount > 0"
          class="absolute -top-1 -right-1 size-3.5 rounded-full bg-primary-500 text-white text-[9px] flex items-center justify-center"
        >
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- Expanded state -->
    <template v-else>
      <!-- Header -->
      <div class="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-filter" class="size-3.5 text-neutral-500" />
          <span class="text-xs font-medium">Filters</span>
          <span
            v-if="activeFilterCount > 0"
            class="size-4 rounded-full bg-primary-500 text-white text-[9px] flex items-center justify-center"
          >
            {{ activeFilterCount }}
          </span>
        </div>
        <div class="flex items-center gap-1">
          <button
            v-if="activeFilterCount > 0"
            class="text-[10px] text-primary-500 hover:underline cursor-pointer"
            @click="clearFilters"
          >
            Clear
          </button>
          <button class="cursor-pointer" @click="collapsed = true">
            <UIcon name="i-lucide-panel-left-close" class="size-3.5 text-neutral-400 hover:text-neutral-600" />
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <!-- Search -->
        <div>
          <UInput
            v-model="filters.search"
            placeholder="Search..."
            icon="i-lucide-search"
            size="xs"
            class="w-full"
          />
        </div>

        <USeparator />

        <!-- Node type -->
        <div>
          <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Type</p>
          <div class="space-y-1">
            <label
              v-for="nt in nodeTypes"
              :key="nt.id"
              class="flex items-center gap-2 py-0.5 cursor-pointer text-xs"
            >
              <UCheckbox
                :model-value="filters.nodeTypes.includes(nt.id)"
                size="xs"
                @update:model-value="filters.nodeTypes = toggleArrayFilter(filters.nodeTypes, nt.id)"
              />
              <span class="size-2 rounded-full" :class="nt.color" />
              <span>{{ nt.label }}</span>
            </label>
          </div>
        </div>

        <USeparator />

        <!-- Path type -->
        <div>
          <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Path</p>
          <div class="space-y-1">
            <label
              v-for="pt in pathTypes"
              :key="pt.id"
              class="flex items-center gap-2 py-0.5 cursor-pointer text-xs"
            >
              <UCheckbox
                :model-value="filters.pathTypes.includes(pt.id)"
                size="xs"
                @update:model-value="filters.pathTypes = toggleArrayFilter(filters.pathTypes, pt.id)"
              />
              <UIcon :name="pt.icon" class="size-3.5 text-neutral-500" />
              <span>{{ pt.label }}</span>
            </label>
          </div>
        </div>

        <USeparator />

        <!-- Starred -->
        <div>
          <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Starred</p>
          <div class="flex gap-1">
            <UButton
              size="xs"
              :variant="filters.starred === null ? 'solid' : 'ghost'"
              :color="filters.starred === null ? 'primary' : 'neutral'"
              label="All"
              @click="filters.starred = null"
            />
            <UButton
              size="xs"
              :variant="filters.starred === true ? 'solid' : 'ghost'"
              :color="filters.starred === true ? 'primary' : 'neutral'"
              icon="i-lucide-star"
              @click="filters.starred = true"
            />
            <UButton
              size="xs"
              :variant="filters.starred === false ? 'solid' : 'ghost'"
              :color="filters.starred === false ? 'primary' : 'neutral'"
              icon="i-lucide-star-off"
              @click="filters.starred = false"
            />
          </div>
        </div>

        <USeparator />

        <!-- Pinned -->
        <div>
          <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Pinned</p>
          <div class="flex gap-1">
            <UButton
              size="xs"
              :variant="filters.pinned === null ? 'solid' : 'ghost'"
              :color="filters.pinned === null ? 'primary' : 'neutral'"
              label="All"
              @click="filters.pinned = null"
            />
            <UButton
              size="xs"
              :variant="filters.pinned === true ? 'solid' : 'ghost'"
              :color="filters.pinned === true ? 'primary' : 'neutral'"
              icon="i-lucide-pin"
              @click="filters.pinned = true"
            />
            <UButton
              size="xs"
              :variant="filters.pinned === false ? 'solid' : 'ghost'"
              :color="filters.pinned === false ? 'primary' : 'neutral'"
              icon="i-lucide-pin-off"
              @click="filters.pinned = false"
            />
          </div>
        </div>

        <!-- Branches (only if multiple exist) -->
        <template v-if="availableBranches.length > 1">
          <USeparator />
          <div>
            <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Branch</p>
            <div class="space-y-1">
              <label
                v-for="b in availableBranches"
                :key="b.name"
                class="flex items-center gap-2 py-0.5 cursor-pointer text-xs"
              >
                <UCheckbox
                  :model-value="filters.branches.includes(b.name)"
                  size="xs"
                  @update:model-value="filters.branches = toggleArrayFilter(filters.branches, b.name)"
                />
                <span class="flex-1 truncate">{{ b.name }}</span>
                <span class="text-[10px] text-neutral-400">{{ b.count }}</span>
              </label>
            </div>
          </div>
        </template>

        <!-- Version tags (only if they exist) -->
        <template v-if="availableVersionTags.length > 0">
          <USeparator />
          <div>
            <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1.5">Version</p>
            <div class="space-y-1">
              <label
                v-for="v in availableVersionTags"
                :key="v.name"
                class="flex items-center gap-2 py-0.5 cursor-pointer text-xs"
              >
                <UCheckbox
                  :model-value="filters.versionTags.includes(v.name)"
                  size="xs"
                  @update:model-value="filters.versionTags = toggleArrayFilter(filters.versionTags, v.name)"
                />
                <span class="font-mono">{{ v.name }}</span>
                <span class="text-[10px] text-neutral-400">{{ v.count }}</span>
              </label>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer: match count -->
      <div
        v-if="filteredIds !== null"
        class="px-3 py-2 border-t border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-400"
      >
        {{ filteredIds.size }} / {{ decisions.length }} nodes
      </div>
    </template>
  </div>
</template>
