<script setup lang="ts">
const { teamId } = useTeamContext()

const { data: decisions, refresh } = useCollectionQuery('thinkgraphDecisions')

// Create a new root decision
const { open } = useCrouton()

function addRootDecision() {
  open('create', 'thinkgraphDecisions')
}

function onNodeClick(nodeId: string, data: Record<string, unknown>) {
  open('update', 'thinkgraphDecisions', [nodeId])
}

function addChildDecision(parentId: string) {
  open('create', 'thinkgraphDecisions', [], {
    defaults: { parentId }
  })
}

function onNodeDblClick(nodeId: string, data: Record<string, unknown>) {
  addChildDecision(nodeId)
}
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
        :rows="decisions"
        collection="thinkgraphDecisions"
        parent-field="parentId"
        label-field="content"
        minimap
        @node-click="onNodeClick"
        @node-dbl-click="onNodeDblClick"
      />
      <div
        v-else
        class="h-full flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-600"
      >
        <UIcon name="i-lucide-brain-circuit" class="size-12 mb-4" />
        <p class="text-lg font-medium mb-2">Start thinking</p>
        <p class="text-sm mb-4">Add your first decision to begin exploring.</p>
        <UButton
          icon="i-lucide-plus"
          label="New Decision"
          @click="addRootDecision"
        />
      </div>
    </div>

    <!-- Crouton modal/slideover for CRUD -->
    <CroutonCollection collection="thinkgraphDecisions" @saved="refresh" />
  </div>
</template>
