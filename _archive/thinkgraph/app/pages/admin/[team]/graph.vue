<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const { teamId } = useTeamContext()

// ── Data ───────────────────────────────────────────────────────────────────────
const { data: decisions, refresh: refreshDecisions } = await useFetch(
  () => teamId.value ? `/api/teams/${teamId.value}/thinkgraph-decisions` : null,
  { default: () => [] }
)

// ── Selected node state ────────────────────────────────────────────────────────
const selectedNode = ref<Record<string, unknown> | null>(null)
const selectedNodeId = ref<string | null>(null)

// ── QuickAdd paste input ───────────────────────────────────────────────────────
const quickAddText = ref('')
const quickAddLoading = ref(false)
const quickAddError = ref('')

const PATH_TYPES = [
  { id: 'diverge', label: 'Explore', icon: 'i-lucide-git-branch', color: 'blue' },
  { id: 'deep-dive', label: 'Deep Dive', icon: 'i-lucide-search', color: 'purple' },
  { id: 'prototype', label: 'Prototype', icon: 'i-lucide-hammer', color: 'orange' },
  { id: 'converge', label: 'Converge', icon: 'i-lucide-check-circle', color: 'green' },
  { id: 'validate', label: 'Validate', icon: 'i-lucide-flask-conical', color: 'yellow' },
  { id: 'park', label: 'Park', icon: 'i-lucide-pause-circle', color: 'neutral' }
] as const

// Parse DECISION: {...} paste format or plain text
function parseQuickAdd(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Try JSON format: DECISION: {...}
  const match = trimmed.match(/^DECISION:\s*(\{[\s\S]*\})$/i)
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch {
      // fall through to plain text
    }
  }

  // Plain text → insight node
  return { content: trimmed, pathType: 'diverge' }
}

async function submitQuickAdd() {
  const parsed = parseQuickAdd(quickAddText.value)
  if (!parsed) return

  quickAddLoading.value = true
  quickAddError.value = ''

  try {
    const parentId = selectedNodeId.value ?? undefined
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions`, {
      method: 'POST',
      body: { ...parsed, parentId }
    })
    quickAddText.value = ''
    await refreshDecisions()
  } catch (err: any) {
    quickAddError.value = err?.statusMessage ?? 'Failed to create decision'
  } finally {
    quickAddLoading.value = false
  }
}

// ── Node click handler ─────────────────────────────────────────────────────────
function handleNodeClick(nodeId: string, data: Record<string, unknown>) {
  selectedNodeId.value = nodeId
  selectedNode.value = { id: nodeId, ...data }
}

// ── Update selected node field ────────────────────────────────────────────────
const updateLoading = ref(false)

async function updateSelectedField(field: string, value: unknown) {
  if (!selectedNodeId.value) return

  updateLoading.value = true
  try {
    const updated = await $fetch<Record<string, unknown>>(
      `/api/teams/${teamId.value}/thinkgraph-decisions/${selectedNodeId.value}`,
      { method: 'PATCH', body: { [field]: value } }
    )
    selectedNode.value = updated
    await refreshDecisions()
  } finally {
    updateLoading.value = false
  }
}

// ── Context generation ────────────────────────────────────────────────────────
const contextLoading = ref(false)
const contextCopied = ref(false)

async function copyContext() {
  if (!selectedNodeId.value) return

  contextLoading.value = true
  try {
    const result = await $fetch<{ context: string }>(
      `/api/teams/${teamId.value}/thinkgraph-decisions/context/${selectedNodeId.value}`
    )
    await navigator.clipboard.writeText(result.context)
    contextCopied.value = true
    setTimeout(() => { contextCopied.value = false }, 2000)
  } finally {
    contextLoading.value = false
  }
}

// ── Delete node ───────────────────────────────────────────────────────────────
async function deleteSelected() {
  if (!selectedNodeId.value) return

  await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${selectedNodeId.value}`, {
    method: 'DELETE'
  })
  selectedNode.value = null
  selectedNodeId.value = null
  await refreshDecisions()
}

// Unique flow ID per team
const flowId = computed(() => teamId.value ? `decisions-${teamId.value}` : undefined)
</script>

<template>
  <div class="flex h-full overflow-hidden">
    <!-- ── Left: Canvas ────────────────────────────────────────────────────── -->
    <div class="flex-1 relative">
      <CroutonFlow
        :rows="decisions"
        collection="thinkgraphDecisions"
        parent-field="parentId"
        label-field="content"
        :sync="!!flowId"
        :flow-id="flowId"
        :minimap="true"
        @node-click="handleNodeClick"
      />
    </div>

    <!-- ── Right: Sidebar ─────────────────────────────────────────────────── -->
    <div class="w-80 border-l border-[var(--ui-border)] flex flex-col bg-[var(--ui-bg)] overflow-y-auto">

      <!-- QuickAdd section -->
      <div class="p-4 border-b border-[var(--ui-border)]">
        <p class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-2">
          Quick Add
        </p>
        <UTextarea
          v-model="quickAddText"
          placeholder="Type an insight or paste DECISION: {...}"
          :rows="3"
          class="w-full text-sm"
          @keydown.meta.enter="submitQuickAdd"
          @keydown.ctrl.enter="submitQuickAdd"
        />
        <p v-if="selectedNodeId" class="text-[10px] text-[var(--ui-text-muted)] mt-1">
          Will attach as child of selected node
        </p>
        <p v-if="quickAddError" class="text-xs text-red-500 mt-1">{{ quickAddError }}</p>
        <UButton
          class="mt-2 w-full"
          size="sm"
          :loading="quickAddLoading"
          :disabled="!quickAddText.trim()"
          @click="submitQuickAdd"
        >
          Add to Graph
        </UButton>
      </div>

      <!-- Node detail panel -->
      <div v-if="selectedNode" class="flex-1 p-4 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-2">
          <p class="text-sm font-semibold text-[var(--ui-text-highlighted)] leading-snug line-clamp-3">
            {{ selectedNode.content }}
          </p>
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="selectedNode = null; selectedNodeId = null"
          />
        </div>

        <!-- Path Type picker -->
        <div>
          <p class="text-xs font-semibold text-[var(--ui-text-muted)] uppercase tracking-wider mb-2">
            Path Type
          </p>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="pt in PATH_TYPES"
              :key="pt.id"
              class="flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all"
              :class="[
                selectedNode.pathType === pt.id
                  ? 'border-[var(--ui-primary)] bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
                  : 'border-[var(--ui-border)] hover:border-[var(--ui-border-accented)] text-[var(--ui-text-muted)]'
              ]"
              @click="updateSelectedField('pathType', pt.id)"
            >
              <UIcon :name="pt.icon" class="size-4" />
              <span>{{ pt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Star toggle -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-[var(--ui-text)]">Star this insight</span>
          <USwitch
            :model-value="!!selectedNode.starred"
            @update:model-value="updateSelectedField('starred', $event)"
          />
        </div>

        <!-- Branch name -->
        <UFormField label="Branch" name="branchName">
          <UInput
            :model-value="(selectedNode.branchName as string) || 'main'"
            size="sm"
            @blur="updateSelectedField('branchName', ($event.target as HTMLInputElement).value)"
          />
        </UFormField>

        <!-- Context copy button -->
        <USeparator />

        <UButton
          :icon="contextCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          :color="contextCopied ? 'success' : 'neutral'"
          variant="soft"
          size="sm"
          :loading="contextLoading"
          class="w-full"
          @click="copyContext"
        >
          {{ contextCopied ? 'Copied!' : 'Copy Context' }}
        </UButton>

        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="sm"
          class="w-full"
          @click="deleteSelected"
        >
          Delete Node
        </UButton>
      </div>

      <!-- Empty state -->
      <div v-else class="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
        <UIcon name="i-lucide-mouse-pointer-click" class="size-10 text-[var(--ui-text-muted)]" />
        <p class="text-sm text-[var(--ui-text-muted)]">
          Click a node to inspect and edit it, or use Quick Add to create one.
        </p>
      </div>
    </div>
  </div>
</template>
