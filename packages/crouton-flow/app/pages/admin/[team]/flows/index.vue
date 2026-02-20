<script setup lang="ts">
const { teamId, teamSlug } = useTeamContext()

const { data: flows, pending, refresh } = await useFetch(
  () => teamId.value ? `/api/crouton-flow/teams/${teamId.value}/flows` : null,
  { default: () => [] }
)

// Create modal
const isCreateOpen = ref(false)
const createForm = reactive({
  name: '',
  description: '',
  collection: '',
  labelField: 'title',
  parentField: 'parentId',
  positionField: 'position',
  syncEnabled: false,
})
const createPending = ref(false)

async function handleCreate() {
  if (!createForm.name.trim() || !createForm.collection.trim()) return
  createPending.value = true
  try {
    await $fetch(`/api/crouton-flow/teams/${teamId.value}/flows`, {
      method: 'POST',
      body: { ...createForm },
    })
    await refresh()
    isCreateOpen.value = false
    Object.assign(createForm, {
      name: '',
      description: '',
      collection: '',
      labelField: 'title',
      parentField: 'parentId',
      positionField: 'position',
      syncEnabled: false,
    })
  } finally {
    createPending.value = false
  }
}

// Delete
const deletingId = ref<string | null>(null)

async function handleDelete(flowId: string) {
  deletingId.value = flowId
  try {
    await $fetch(`/api/crouton-flow/teams/${teamId.value}/flows/${flowId}`, {
      method: 'DELETE',
    })
    await refresh()
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <div class="p-6 flex flex-col gap-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">Flows</h2>
        <p class="text-sm text-muted mt-0.5">Saved flow visualizations for your collections</p>
      </div>
      <UButton icon="i-lucide-plus" @click="isCreateOpen = true">
        New Flow
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="i in 3"
        :key="i"
        class="h-40 rounded-lg bg-elevated animate-pulse"
      />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!flows.length"
      class="flex flex-col items-center justify-center py-20 text-center gap-4"
    >
      <div class="size-14 rounded-full bg-elevated flex items-center justify-center">
        <UIcon name="i-lucide-share-2" class="size-7 text-muted" />
      </div>
      <div>
        <p class="font-medium text-highlighted">No flows yet</p>
        <p class="text-sm text-muted mt-1">Create a flow to visualize your collection data as an interactive graph</p>
      </div>
      <UButton icon="i-lucide-plus" @click="isCreateOpen = true">
        Create your first flow
      </UButton>
    </div>

    <!-- Flow cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="flow in flows"
        :key="flow.id"
        class="group relative flex flex-col gap-3 p-4 rounded-xl border border-default bg-default hover:bg-elevated transition-colors"
      >
        <!-- Card header -->
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="size-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-share-2" class="size-4 text-primary" />
            </div>
            <div class="min-w-0">
              <p class="font-medium text-highlighted truncate">{{ flow.name }}</p>
              <p v-if="flow.description" class="text-xs text-muted truncate mt-0.5">{{ flow.description }}</p>
            </div>
          </div>
          <UDropdownMenu
            :items="[
              [{ label: 'Open canvas', icon: 'i-lucide-maximize-2', to: `/admin/${teamSlug}/flows/${flow.id}` }],
              [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', loading: deletingId === flow.id, onSelect: () => handleDelete(flow.id) }]
            ]"
            :content="{ align: 'end' }"
          >
            <UButton
              size="xs"
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis"
              class="opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </UDropdownMenu>
        </div>

        <!-- Collection badge -->
        <div class="flex items-center gap-2 flex-wrap">
          <UBadge color="neutral" variant="soft" size="sm">
            <UIcon name="i-lucide-database" class="size-3 mr-1" />
            {{ flow.collection }}
          </UBadge>
          <UBadge v-if="flow.syncEnabled" color="success" variant="soft" size="sm">
            <UIcon name="i-lucide-radio" class="size-3 mr-1" />
            Live sync
          </UBadge>
        </div>

        <!-- Open button -->
        <UButton
          :to="`/admin/${teamSlug}/flows/${flow.id}`"
          color="neutral"
          variant="outline"
          size="sm"
          icon="i-lucide-maximize-2"
          class="mt-auto"
        >
          Open canvas
        </UButton>
      </div>
    </div>
  </div>

  <!-- Create modal -->
  <UModal v-model:open="isCreateOpen" title="New Flow">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name" required>
          <UInput v-model="createForm.name" placeholder="e.g. Decision Tree" class="w-full" />
        </UFormField>

        <UFormField label="Description">
          <UInput v-model="createForm.description" placeholder="Optional description" class="w-full" />
        </UFormField>

        <UFormField label="Collection" required hint="The collection to visualize">
          <UInput v-model="createForm.collection" placeholder="e.g. decisions" class="w-full" />
        </UFormField>

        <USeparator />

        <p class="text-xs font-medium text-muted uppercase tracking-wide">Field mapping</p>

        <div class="grid grid-cols-3 gap-3">
          <UFormField label="Label field">
            <UInput v-model="createForm.labelField" class="w-full" />
          </UFormField>
          <UFormField label="Parent field">
            <UInput v-model="createForm.parentField" class="w-full" />
          </UFormField>
          <UFormField label="Position field">
            <UInput v-model="createForm.positionField" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Live sync">
          <div class="flex items-center gap-2">
            <USwitch v-model="createForm.syncEnabled" />
            <span class="text-sm text-muted">Enable real-time multiplayer sync</span>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isCreateOpen = false">Cancel</UButton>
        <UButton
          :loading="createPending"
          :disabled="!createForm.name.trim() || !createForm.collection.trim()"
          icon="i-lucide-plus"
          @click="handleCreate"
        >
          Create flow
        </UButton>
      </div>
    </template>
  </UModal>
</template>
