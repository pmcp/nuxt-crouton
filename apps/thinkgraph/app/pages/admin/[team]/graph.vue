<script setup lang="ts">
import ThinkgraphDecisionsNode from '~/components/ThinkgraphDecisionsNode.vue'

// Register globally so CroutonFlow's resolveComponent() can find it
const app = useNuxtApp().vueApp
if (!app.component('ThinkgraphDecisionsNode')) {
  app.component('ThinkgraphDecisionsNode', ThinkgraphDecisionsNode)
}

const { teamId } = useTeamContext()

const { items: decisions, refresh } = await useCollectionQuery('thinkgraphDecisions')

const { open } = useCrouton()
const expanding = ref<string | null>(null)
const showQuickAdd = ref(false)
const quickAddParentId = ref<string | undefined>()

const { generateContext, copyContext } = useContextGenerator(decisions)

function addRootDecision() {
  open('create', 'thinkgraphDecisions')
}

function onNodeClick(nodeId: string, data: Record<string, unknown>) {
  open('update', 'thinkgraphDecisions', [nodeId])
}

async function expandWithAI(decisionId: string) {
  if (expanding.value) return
  expanding.value = decisionId

  try {
    await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decisionId}/expand`, {
      method: 'POST'
    })
    await refresh()
  } catch (error) {
    console.error('AI expand failed:', error)
  } finally {
    expanding.value = null
  }
}

function openQuickAdd(parentId?: string) {
  quickAddParentId.value = parentId
  showQuickAdd.value = true
}

async function onQuickAddDone() {
  showQuickAdd.value = false
  await refresh()
}

// Provide functions to child nodes
provide('thinkgraph:expand', expandWithAI)
provide('thinkgraph:expanding', expanding)
provide('thinkgraph:copyContext', copyContext)
provide('thinkgraph:openQuickAdd', openQuickAdd)
</script>

<template>
  <div class="h-screen flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-brain-circuit" class="size-5 text-primary-500" />
        <h1 class="text-lg font-semibold">ThinkGraph</h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-clipboard-paste"
          label="Paste"
          size="sm"
          variant="outline"
          color="neutral"
          @click="openQuickAdd()"
        />
        <UButton
          icon="i-lucide-plus"
          label="New Decision"
          size="sm"
          @click="addRootDecision"
        />
      </div>
    </div>

    <!-- Graph -->
    <div class="flex-1">
      <CroutonFlow
        v-if="decisions?.length"
        :key="decisions.length"
        :rows="decisions"
        collection="thinkgraphDecisions"
        parent-field="parentId"
        label-field="content"
        minimap
        @node-click="onNodeClick"
      />
      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600"
      >
        <UIcon name="i-lucide-brain-circuit" class="size-12 mb-4" />
        <p class="text-lg font-medium mb-2">Start thinking</p>
        <p class="text-sm mb-4">Add your first decision to begin exploring.</p>
        <div class="flex gap-2">
          <UButton
            icon="i-lucide-clipboard-paste"
            label="Paste AI Output"
            variant="outline"
            color="neutral"
            @click="openQuickAdd()"
          />
          <UButton
            icon="i-lucide-plus"
            label="New Decision"
            @click="addRootDecision"
          />
        </div>
      </div>
    </div>

    <!-- Quick Add Modal -->
    <UModal v-model:open="showQuickAdd">
      <template #content>
        <QuickAdd :parent-id="quickAddParentId" @added="onQuickAddDone" />
      </template>
    </UModal>

    <!-- Crouton modal/slideover for CRUD -->
    <CroutonCollection collection="thinkgraphDecisions" @saved="refresh" />
  </div>
</template>
