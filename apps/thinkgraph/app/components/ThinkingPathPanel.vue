<script setup lang="ts">
interface Props {
  nodeId: string | null
  decisions: any[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'select-node': [nodeId: string]
  'open-chat': [nodeId: string]
  'expand': [nodeId: string, mode?: string]
  'dispatch': [nodeId: string]
  'edit': [nodeId: string]
  'add-child': [nodeId: string]
}>()

const { generateContext, copyContext } = useContextGenerator(computed(() => props.decisions))

// Build ancestor chain for selected node
function getNodeById(id: string) {
  return props.decisions.find((d) => d.id === id)
}

const ancestorChain = computed(() => {
  if (!props.nodeId) return []
  const chain: any[] = []
  let current = getNodeById(props.nodeId)
  while (current) {
    chain.unshift(current)
    current = current.parentId ? getNodeById(current.parentId) : null
  }
  return chain
})

// Children of the selected node
const children = computed(() => {
  if (!props.nodeId) return []
  return props.decisions.filter((d) => d.parentId === props.nodeId)
})

// Selected node
const selectedNode = computed(() => {
  if (!props.nodeId) return null
  return getNodeById(props.nodeId)
})

// Starred insights from other branches
const starredInsights = computed(() => {
  if (!props.nodeId) return []
  const ancestorIds = new Set(ancestorChain.value.map((n: any) => n.id))
  return props.decisions.filter((d) => d.starred && !ancestorIds.has(d.id))
})

const nodeTypeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  idea: { icon: 'i-lucide-lightbulb', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  insight: { icon: 'i-lucide-eye', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  decision: { icon: 'i-lucide-check-circle', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  question: { icon: 'i-lucide-help-circle', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
}

function getNodeConfig(nodeType: string) {
  return nodeTypeConfig[nodeType] || nodeTypeConfig.insight
}

const contextCopied = ref(false)
async function handleCopyContext() {
  if (!props.nodeId) return
  await copyContext(props.nodeId)
  contextCopied.value = true
  setTimeout(() => { contextCopied.value = false }, 2000)
}
</script>

<template>
  <div class="w-[340px] border-l border-default flex flex-col h-full bg-default flex-shrink-0">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-default shrink-0">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon name="i-lucide-route" class="size-4 text-primary shrink-0" />
        <span class="text-sm font-semibold truncate">Thinking Path</span>
      </div>
      <UButton
        icon="i-lucide-x"
        size="xs"
        variant="ghost"
        color="neutral"
        @click="emit('close')"
      />
    </div>

    <!-- Empty state -->
    <div v-if="!nodeId" class="flex-1 flex items-center justify-center p-6 text-center">
      <div>
        <UIcon name="i-lucide-mouse-pointer-click" class="size-8 text-muted mx-auto mb-3" />
        <p class="text-sm text-muted">Click a node to see its thinking path</p>
      </div>
    </div>

    <!-- Path content -->
    <div v-else class="flex-1 overflow-y-auto">
      <!-- Ancestor chain -->
      <div class="px-3 pt-3 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">Path</p>

        <div class="space-y-0">
          <div
            v-for="(node, index) in ancestorChain"
            :key="node.id"
            class="relative"
          >
            <!-- Connector line -->
            <div
              v-if="index > 0"
              class="absolute left-[15px] -top-1 w-px h-2 bg-neutral-200 dark:bg-neutral-700"
            />

            <button
              class="w-full text-left px-2 py-2 rounded-lg transition-all group cursor-pointer"
              :class="[
                node.id === nodeId
                  ? 'bg-primary-50 dark:bg-primary-950/30 ring-1 ring-primary-200 dark:ring-primary-800'
                  : 'hover:bg-muted/50'
              ]"
              @click="emit('select-node', node.id)"
            >
              <div class="flex items-start gap-2.5">
                <!-- Node type icon -->
                <div
                  class="mt-0.5 size-[22px] rounded-md flex items-center justify-center shrink-0"
                  :class="getNodeConfig(node.nodeType).bg"
                >
                  <UIcon
                    :name="getNodeConfig(node.nodeType).icon"
                    class="size-3.5"
                    :class="getNodeConfig(node.nodeType).color"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <!-- Type + starred -->
                  <div class="flex items-center gap-1.5 mb-0.5">
                    <span class="text-[10px] font-medium" :class="getNodeConfig(node.nodeType).color">
                      {{ node.nodeType }}
                    </span>
                    <UIcon
                      v-if="node.starred"
                      name="i-lucide-star"
                      class="size-3 text-amber-400"
                    />
                    <UIcon
                      v-if="node.source === 'mcp' || node.source === 'ai' || node.source === 'dispatch'"
                      name="i-lucide-sparkles"
                      class="size-3 text-violet-400"
                    />
                  </div>

                  <!-- Content -->
                  <p
                    class="text-sm leading-snug"
                    :class="node.id === nodeId ? 'text-highlighted font-medium' : 'text-muted group-hover:text-highlighted'"
                  >
                    {{ node.content?.length > 120 ? node.content.slice(0, 117) + '...' : node.content }}
                  </p>
                </div>
              </div>
            </button>

            <!-- Connector line after (except last) -->
            <div
              v-if="index < ancestorChain.length - 1"
              class="absolute left-[15px] -bottom-1 w-px h-2 bg-neutral-200 dark:bg-neutral-700"
            />
          </div>
        </div>
      </div>

      <!-- Children -->
      <div v-if="children.length" class="px-3 pt-2 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">
          Children ({{ children.length }})
        </p>

        <div class="space-y-1">
          <button
            v-for="child in children"
            :key="child.id"
            class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer"
            @click="emit('select-node', child.id)"
          >
            <div class="flex items-start gap-2">
              <UIcon
                :name="getNodeConfig(child.nodeType).icon"
                class="size-3.5 mt-0.5 shrink-0"
                :class="getNodeConfig(child.nodeType).color"
              />
              <p class="text-xs text-muted group-hover:text-highlighted leading-snug">
                {{ child.content?.length > 80 ? child.content.slice(0, 77) + '...' : child.content }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- Starred from other branches -->
      <div v-if="starredInsights.length" class="px-3 pt-2 pb-1">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-wider px-1 mb-2">
          Starred from other branches
        </p>

        <div class="space-y-1">
          <button
            v-for="node in starredInsights"
            :key="node.id"
            class="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-all group cursor-pointer"
            @click="emit('select-node', node.id)"
          >
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-star" class="size-3.5 mt-0.5 shrink-0 text-amber-400" />
              <p class="text-xs text-muted group-hover:text-highlighted leading-snug">
                {{ node.content?.length > 80 ? node.content.slice(0, 77) + '...' : node.content }}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Actions footer -->
    <div v-if="nodeId && selectedNode" class="px-3 py-3 border-t border-default shrink-0 space-y-2">
      <!-- Quick actions row -->
      <div class="flex gap-1.5">
        <UButton
          icon="i-lucide-sparkles"
          size="xs"
          variant="soft"
          color="violet"
          title="Expand with AI"
          @click="emit('expand', nodeId)"
        />
        <UButton
          icon="i-lucide-message-square-text"
          size="xs"
          variant="soft"
          color="blue"
          title="Chat"
          @click="emit('open-chat', nodeId)"
        />
        <UButton
          icon="i-lucide-send"
          size="xs"
          variant="soft"
          color="teal"
          title="Dispatch"
          @click="emit('dispatch', nodeId)"
        />
        <UButton
          icon="i-lucide-plus"
          size="xs"
          variant="soft"
          color="neutral"
          title="Add child"
          @click="emit('add-child', nodeId)"
        />
        <UButton
          icon="i-lucide-pencil"
          size="xs"
          variant="soft"
          color="neutral"
          title="Edit"
          @click="emit('edit', nodeId)"
        />
        <div class="flex-1" />
        <UButton
          :icon="contextCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          size="xs"
          variant="ghost"
          color="neutral"
          title="Copy context"
          @click="handleCopyContext"
        />
      </div>
    </div>
  </div>
</template>
