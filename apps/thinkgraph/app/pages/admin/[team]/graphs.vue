<script setup lang="ts">
import type { ThinkgraphNode } from '../../../layers/thinkgraph/collections/nodes/types'

definePageMeta({ layout: 'admin' })

const { teamId } = useTeamContext()
const { open } = useCrouton()
const nuxtApp = useNuxtApp()

// ─── Workspace state ───
const selectedGraphId = ref<string | null>(null)
const layoutRef = ref<{ select: (item: any) => void; create: () => void } | null>(null)

// ─── Graphs list ───
const { items: graphs, pending: loadingGraphs, refresh: refreshGraphs } = await useCollectionQuery('thinkgraphGraphs')
const { create: createGraph } = useCollectionMutation('thinkgraphGraphs')

// ─── Create graph modal ───
const isCreateOpen = ref(false)
const createForm = reactive({ name: '', description: '' })
const createPending = ref(false)

async function handleCreate() {
  if (!createForm.name.trim()) return
  createPending.value = true
  try {
    const created = await createGraph({
      name: createForm.name,
      description: createForm.description,
    })
    isCreateOpen.value = false
    Object.assign(createForm, { name: '', description: '' })
    await refreshGraphs()
    if (created?.id) {
      layoutRef.value?.select(created)
    }
  } finally {
    createPending.value = false
  }
}

// ─── Decisions for selected graph ───
const decisions = ref<ThinkgraphNode[]>([])
const decisionsLoading = ref(false)

async function refreshDecisions() {
  if (!selectedGraphId.value || !teamId.value) {
    decisions.value = []
    return
  }
  decisionsLoading.value = true
  try {
    const result = await $fetch<ThinkgraphNode[]>(`/api/teams/${teamId.value}/thinkgraph-nodes`, {
      query: { graphId: selectedGraphId.value },
    })
    decisions.value = result || []
  } catch {
    decisions.value = []
  } finally {
    decisionsLoading.value = false
  }
}

// Auto-refresh when any thinkgraphNodes mutation happens (local or remote)
nuxtApp.hook('crouton:mutation', ({ collection }: any) => {
  if (collection === 'thinkgraphNodes') refreshDecisions()
})
nuxtApp.hook('crouton:remoteChange' as any, ({ collection }: any) => {
  if (collection === 'thinkgraphNodes') refreshDecisions()
})

// ─── Graph change watcher ───
watch(selectedGraphId, async (newId) => {
  if (newId) {
    await refreshDecisions()
  } else {
    decisions.value = []
  }
})

// ─── Derived state ───
const selectedGraph = computed(() =>
  graphs.value?.find(g => g.id === selectedGraphId.value),
)
</script>

<template>
  <CroutonWorkspaceLayout
    ref="layoutRef"
    v-model="selectedGraphId"
    query-param="graph"
    title="ThinkGraph"
    sidebar-id="thinkgraph-sidebar"
  >
    <template #sidebar-actions>
      <UButton
        color="primary"
        variant="ghost"
        icon="i-lucide-plus"
        size="sm"
        @click="isCreateOpen = true"
      />
    </template>

    <template #sidebar="{ selectedId }">
      <div class="flex flex-col h-full">
        <!-- Loading -->
        <div v-if="loadingGraphs" class="p-6 flex justify-center">
          <UIcon name="i-lucide-loader-2" class="size-5 animate-spin text-muted" />
        </div>

        <!-- Empty -->
        <div
          v-else-if="!graphs?.length"
          class="p-6 text-center text-muted flex-1"
        >
          <UIcon name="i-lucide-brain-circuit" class="size-8 mb-2 opacity-50" />
          <p class="text-sm">No graphs yet</p>
          <UButton
            size="sm"
            color="primary"
            variant="soft"
            class="mt-3"
            @click="isCreateOpen = true"
          >
            New Graph
          </UButton>
        </div>

        <!-- Graph list -->
        <div v-else class="flex-1 overflow-auto">
          <ul role="list" class="divide-y divide-default">
            <li
              v-for="graph in graphs"
              :key="graph.id"
              class="group px-4 py-3 cursor-pointer transition-colors"
              :class="[
                selectedId === graph.id
                  ? 'bg-primary-50 dark:bg-primary-950/30 border-l-2 border-primary'
                  : 'hover:bg-muted/50 border-l-2 border-transparent'
              ]"
              @click="layoutRef?.select(graph)"
            >
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-brain-circuit" class="size-4 shrink-0 text-muted" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium truncate">{{ graph.name }}</p>
                  <p v-if="graph.description" class="text-xs text-muted truncate mt-0.5">
                    {{ graph.description }}
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #content>
      <GraphEditor
        v-if="selectedGraphId && selectedGraph"
        :graph-id="selectedGraphId"
        :graph-name="selectedGraph.name"
        :decisions="decisions"
        :decisions-loading="decisionsLoading"
        @refresh-decisions="refreshDecisions"
      />
    </template>

    <template #empty>
      <div class="flex-1 flex items-center justify-center text-muted">
        <div class="text-center max-w-md px-6">
          <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-lucide-brain-circuit" class="size-8 text-muted" />
          </div>
          <h3 class="text-lg font-semibold mb-2">Select a graph</h3>
          <p class="text-sm text-muted mb-6">
            Choose a graph from the sidebar, or create a new one to start thinking.
          </p>
          <UButton color="primary" icon="i-lucide-plus" @click="isCreateOpen = true">
            Create new graph
          </UButton>
        </div>
      </div>
    </template>
  </CroutonWorkspaceLayout>

  <!-- Create graph modal -->
  <UModal v-model:open="isCreateOpen">
    <template #content="{ close }">
      <div class="p-6">
        <h3 class="text-lg font-semibold mb-4">New Graph</h3>
        <div class="flex flex-col gap-4">
          <UFormField label="Name" required>
            <UInput v-model="createForm.name" placeholder="e.g. Product Strategy" class="w-full" />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="createForm.description" placeholder="Optional description" class="w-full" />
          </UFormField>
        </div>
        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
          <UButton
            :loading="createPending"
            :disabled="!createForm.name.trim()"
            icon="i-lucide-plus"
            @click="handleCreate"
          >
            Create graph
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
