<script setup lang="ts">
interface TreeNode {
  id: string
  title: string
  type: string
  status: string
  brief?: string
  output?: string
  parentId?: string
  assignee?: string
  deployUrl?: string
  retrospective?: string
  children: TreeNode[]
}

interface StatusConfig {
  icon: string
  label: string
  class: string
}

const props = defineProps<{
  node: TreeNode
  depth: number
  typeConfig: Record<string, { icon: string; color: string }>
  statusConfig: Record<string, StatusConfig>
}>()

const expanded = ref(props.node.status === 'active' || props.node.status === 'done')
const hasChildren = computed(() => props.node.children.length > 0)

const typeConf = computed(() => props.typeConfig[props.node.type] || { icon: 'i-lucide-circle', color: 'text-neutral-500' })
const statusConf = computed(() => props.statusConfig[props.node.status] || props.statusConfig.queued)
</script>

<template>
  <div :class="{ 'ml-6': depth > 0 }">
    <div
      class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 transition-all"
      :class="{
        'border-green-300 dark:border-green-700': node.status === 'done',
        'border-primary-300 dark:border-primary-700 shadow-sm': node.status === 'active',
      }"
    >
      <div class="flex items-center gap-3">
        <!-- Expand toggle -->
        <button
          v-if="hasChildren"
          class="text-muted hover:text-default transition-colors"
          @click="expanded = !expanded"
        >
          <UIcon
            :name="expanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4"
          />
        </button>
        <div v-else class="w-4" />

        <!-- Status icon -->
        <UIcon :name="statusConf.icon" class="size-5 shrink-0" :class="statusConf.class" />

        <!-- Type icon -->
        <UIcon :name="typeConf.icon" class="size-4 shrink-0" :class="typeConf.color" />

        <!-- Title -->
        <span class="text-sm font-medium flex-1">{{ node.title }}</span>

        <!-- Status label -->
        <span class="text-xs text-muted">{{ statusConf.label }}</span>
      </div>

      <!-- Brief / output preview -->
      <div v-if="node.output && node.status === 'done'" class="mt-2 ml-11">
        <p class="text-xs text-muted line-clamp-2">{{ node.output }}</p>
      </div>
      <div v-else-if="node.brief && node.status !== 'done'" class="mt-2 ml-11">
        <p class="text-xs text-muted line-clamp-2">{{ node.brief }}</p>
      </div>

      <!-- Deploy URL -->
      <div v-if="node.deployUrl" class="mt-2 ml-11">
        <a
          :href="node.deployUrl"
          target="_blank"
          rel="noopener"
          class="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline"
        >
          <UIcon name="i-lucide-external-link" class="size-3" />
          Preview
        </a>
      </div>
    </div>

    <!-- Children -->
    <div v-if="hasChildren && expanded" class="mt-2 space-y-2">
      <WorkItemTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :type-config="typeConfig"
        :status-config="statusConfig"
      />
    </div>
  </div>
</template>
