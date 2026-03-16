<script setup lang="ts">
interface Props {
  nodeId: string
  decisions: any[]
}

const props = defineProps<Props>()

const { generateContext } = useContextGenerator(computed(() => props.decisions))
const { copy } = useClipboard()

const nodeTypeConfig: Record<string, { color: string }> = {
  idea: { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  insight: { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  decision: { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  question: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

function getNodeById(id: string) {
  return props.decisions.find((d: any) => d.id === id)
}

// Ancestor chain (root -> current)
const ancestorChain = computed(() => {
  const chain: any[] = []
  let current = getNodeById(props.nodeId)
  while (current) {
    chain.unshift(current)
    current = current.parentId ? getNodeById(current.parentId) : null
  }
  return chain
})

const ancestorIds = computed(() => new Set(ancestorChain.value.map((n: any) => n.id)))

const selectedNode = computed(() => getNodeById(props.nodeId))

// Pinned nodes (not in ancestor chain)
const pinnedNodes = computed(() =>
  props.decisions.filter((d: any) => d.pinned && !ancestorIds.value.has(d.id)),
)

// Starred nodes (not in ancestor chain)
const starredNodes = computed(() => {
  const starred = props.decisions.filter((d: any) => d.starred && !ancestorIds.value.has(d.id))
  return starred.slice(0, 5)
})

const totalStarred = computed(() =>
  props.decisions.filter((d: any) => d.starred && !ancestorIds.value.has(d.id)).length,
)

// Siblings & children
const siblings = computed(() => {
  if (!selectedNode.value?.parentId) return []
  return props.decisions.filter(
    (d: any) => d.parentId === selectedNode.value.parentId && d.id !== props.nodeId,
  )
})

const children = computed(() =>
  props.decisions.filter((d: any) => d.parentId === props.nodeId),
)

// Token estimate
const totalTokens = computed(() => {
  const context = generateContext(props.nodeId)
  return Math.ceil(context.length / 4)
})

// Section toggles
const showPath = ref(true)
const showPinned = ref(true)
const showStarred = ref(true)
const showSiblings = ref(false)

function truncate(text: string, max = 60): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 3) + '...' : text
}

function getNodeTypeStyle(nodeType: string) {
  return nodeTypeConfig[nodeType]?.color || nodeTypeConfig.insight.color
}

function getParentContent(node: any): string {
  if (!node.parentId) return 'root'
  const parent = getNodeById(node.parentId)
  return parent ? truncate(parent.content, 30) : 'unknown'
}

const copied = ref(false)
async function copyFullContext() {
  const context = generateContext(props.nodeId)
  await copy(context)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="w-[340px] flex flex-col h-full border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
    <!-- Header -->
    <div class="flex items-center gap-2 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      <UIcon name="i-lucide-layers" class="size-4 text-primary-500" />
      <span class="text-sm font-medium">Context Inspector</span>
    </div>

    <!-- Sections -->
    <div class="flex-1 overflow-y-auto">
      <!-- 1. Path Context (Lexical) -->
      <div class="border-b border-neutral-100 dark:border-neutral-800">
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          @click="showPath = !showPath"
        >
          <UIcon name="i-lucide-route" class="size-3.5 text-blue-500" />
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Path Context</span>
          <span class="text-[10px] text-neutral-400 ml-auto">{{ ancestorChain.length }} nodes</span>
          <UIcon
            :name="showPath ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-neutral-400"
          />
        </button>
        <div v-if="showPath" class="px-4 pb-3">
          <div class="space-y-1">
            <div
              v-for="(node, i) in ancestorChain"
              :key="node.id"
              class="flex items-start gap-2"
              :style="{ paddingLeft: `${i * 12}px` }"
            >
              <UIcon
                :name="node.id === nodeId ? 'i-lucide-circle-dot' : 'i-lucide-circle'"
                class="size-3 mt-0.5 shrink-0"
                :class="node.id === nodeId ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
              />
              <div class="min-w-0">
                <span
                  class="text-[10px] font-medium px-1 py-0.5 rounded-full mr-1"
                  :class="getNodeTypeStyle(node.nodeType)"
                >
                  {{ node.nodeType }}
                </span>
                <span class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ truncate(node.content) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Pinned Context (Dynamic) -->
      <div class="border-b border-neutral-100 dark:border-neutral-800">
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          @click="showPinned = !showPinned"
        >
          <UIcon name="i-lucide-pin" class="size-3.5 text-amber-500" />
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Pinned Context</span>
          <span class="text-[10px] text-neutral-400 ml-auto">{{ pinnedNodes.length }}</span>
          <UIcon
            :name="showPinned ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-neutral-400"
          />
        </button>
        <div v-if="showPinned" class="px-4 pb-3">
          <div v-if="pinnedNodes.length === 0" class="text-xs text-neutral-400 dark:text-neutral-500 italic">
            No pinned nodes
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="node in pinnedNodes"
              :key="node.id"
              class="flex items-start gap-2"
            >
              <UIcon name="i-lucide-pin" class="size-3 mt-0.5 shrink-0 text-amber-400" />
              <div class="min-w-0">
                <span
                  class="text-[10px] font-medium px-1 py-0.5 rounded-full mr-1"
                  :class="getNodeTypeStyle(node.nodeType)"
                >
                  {{ node.nodeType }}
                </span>
                <span class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ truncate(node.content) }}
                </span>
                <span class="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5">
                  from: {{ getParentContent(node) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Starred Insights (Cross-branch) -->
      <div class="border-b border-neutral-100 dark:border-neutral-800">
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          @click="showStarred = !showStarred"
        >
          <UIcon name="i-lucide-star" class="size-3.5 text-yellow-500" />
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Starred Insights</span>
          <span class="text-[10px] text-neutral-400 ml-auto">{{ totalStarred }}</span>
          <UIcon
            :name="showStarred ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-neutral-400"
          />
        </button>
        <div v-if="showStarred" class="px-4 pb-3">
          <div v-if="starredNodes.length === 0" class="text-xs text-neutral-400 dark:text-neutral-500 italic">
            No starred nodes outside path
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="node in starredNodes"
              :key="node.id"
              class="flex items-start gap-2"
            >
              <UIcon name="i-lucide-star" class="size-3 mt-0.5 shrink-0 text-yellow-400" />
              <div class="min-w-0">
                <span
                  class="text-[10px] font-medium px-1 py-0.5 rounded-full mr-1"
                  :class="getNodeTypeStyle(node.nodeType)"
                >
                  {{ node.nodeType }}
                </span>
                <span class="text-xs text-neutral-600 dark:text-neutral-400">
                  {{ truncate(node.content) }}
                </span>
                <span
                  v-if="node.branchName"
                  class="block text-[10px] text-neutral-400 dark:text-neutral-500 mt-0.5"
                >
                  branch: {{ node.branchName }}
                </span>
              </div>
            </div>
            <p v-if="totalStarred > 5" class="text-[10px] text-neutral-400 italic">
              showing top 5 of {{ totalStarred }}
            </p>
          </div>
        </div>
      </div>

      <!-- 4. Siblings & Children (Dedup context) -->
      <div class="border-b border-neutral-100 dark:border-neutral-800">
        <button
          class="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          @click="showSiblings = !showSiblings"
        >
          <UIcon name="i-lucide-git-fork" class="size-3.5 text-neutral-500" />
          <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">Siblings & Children</span>
          <span class="text-[10px] text-neutral-400 ml-auto">{{ siblings.length + children.length }}</span>
          <UIcon
            :name="showSiblings ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-3 text-neutral-400"
          />
        </button>
        <div v-if="showSiblings" class="px-4 pb-3">
          <div v-if="siblings.length === 0 && children.length === 0" class="text-xs text-neutral-400 dark:text-neutral-500 italic">
            No siblings or children
          </div>
          <div v-else class="space-y-2">
            <div v-if="siblings.length > 0">
              <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Siblings</p>
              <div
                v-for="node in siblings"
                :key="node.id"
                class="flex items-start gap-2 ml-1"
              >
                <span class="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 mt-1.5 shrink-0" />
                <div class="min-w-0">
                  <span
                    class="text-[10px] font-medium px-1 py-0.5 rounded-full mr-1"
                    :class="getNodeTypeStyle(node.nodeType)"
                  >
                    {{ node.nodeType }}
                  </span>
                  <span class="text-xs text-neutral-600 dark:text-neutral-400">
                    {{ truncate(node.content) }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="children.length > 0">
              <p class="text-[10px] font-medium text-neutral-400 uppercase tracking-wider mb-1">Children</p>
              <div
                v-for="node in children"
                :key="node.id"
                class="flex items-start gap-2 ml-1"
              >
                <span class="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600 mt-1.5 shrink-0" />
                <div class="min-w-0">
                  <span
                    class="text-[10px] font-medium px-1 py-0.5 rounded-full mr-1"
                    :class="getNodeTypeStyle(node.nodeType)"
                  >
                    {{ node.nodeType }}
                  </span>
                  <span class="text-xs text-neutral-600 dark:text-neutral-400">
                    {{ truncate(node.content) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
      <span class="text-[10px] text-neutral-400">
        ~{{ totalTokens.toLocaleString() }} tokens
      </span>
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        :label="copied ? 'Copied!' : 'Copy full context'"
        size="xs"
        variant="soft"
        :color="copied ? 'success' : 'neutral'"
        @click="copyFullContext"
      />
    </div>
  </div>
</template>