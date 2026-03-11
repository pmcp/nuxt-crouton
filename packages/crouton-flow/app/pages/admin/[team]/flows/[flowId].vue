<script setup lang="ts">
const route = useRoute()
const { teamId, teamSlug } = useTeamContext()

const flowId = computed(() => route.params.flowId as string)

// Fetch flow config
const { data: flow, pending: flowPending } = await useFetch(
  () => teamId.value ? `/api/crouton-flow/teams/${teamId.value}/flows/${flowId.value}` : null,
  { default: () => null }
)

// Fetch collection rows when not in sync mode
const { data: rows, pending: rowsPending } = await useFetch(
  () => flow.value && !flow.value.syncEnabled && teamId.value
    ? `/api/teams/${teamId.value}/${flow.value.collection}`
    : null,
  { default: () => [] }
)

const loading = computed(() => flowPending.value || rowsPending.value)

// Edit modal
const isEditOpen = ref(false)
const editForm = reactive({
  name: '',
  description: '',
  collection: '',
  labelField: 'title',
  parentField: 'parentId',
  positionField: 'position',
  syncEnabled: false,
})
const editPending = ref(false)

function openEdit() {
  if (!flow.value) return
  Object.assign(editForm, {
    name: flow.value.name,
    description: flow.value.description ?? '',
    collection: flow.value.collection,
    labelField: flow.value.labelField ?? 'title',
    parentField: flow.value.parentField ?? 'parentId',
    positionField: flow.value.positionField ?? 'position',
    syncEnabled: flow.value.syncEnabled ?? false,
  })
  isEditOpen.value = true
}

async function handleEdit() {
  if (!flow.value) return
  editPending.value = true
  try {
    await $fetch(`/api/crouton-flow/teams/${teamId.value}/flows/${flowId.value}`, {
      method: 'PATCH',
      body: { ...editForm },
    })
    await refreshNuxtData()
    isEditOpen.value = false
  } finally {
    editPending.value = false
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-default bg-default shrink-0">
      <UButton
        :to="`/admin/${teamSlug}/flows`"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-arrow-left"
      />

      <USeparator orientation="vertical" class="h-4" />

      <template v-if="flow">
        <div class="flex items-center gap-2 min-w-0">
          <UIcon name="i-lucide-share-2" class="size-4 text-primary shrink-0" />
          <span class="font-medium text-highlighted truncate">{{ flow.name }}</span>
          <UBadge color="neutral" variant="soft" size="xs">{{ flow.collection }}</UBadge>
          <UBadge v-if="flow.syncEnabled" color="success" variant="soft" size="xs">
            <UIcon name="i-lucide-radio" class="size-3 mr-1" />
            Live
          </UBadge>
        </div>

        <div class="ml-auto flex items-center gap-2">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-settings"
            @click="openEdit"
          >
            Configure
          </UButton>
        </div>
      </template>
    </div>

    <!-- Canvas -->
    <div class="flex-1 min-h-0">
      <div v-if="loading" class="h-full flex items-center justify-center">
        <UIcon name="i-lucide-loader-2" class="size-6 text-muted animate-spin" />
      </div>

      <div v-else-if="!flow" class="h-full flex items-center justify-center text-center">
        <div>
          <p class="font-medium text-highlighted">Flow not found</p>
          <UButton :to="`/admin/${teamSlug}/flows`" variant="ghost" size="sm" class="mt-2">
            Back to flows
          </UButton>
        </div>
      </div>

      <CroutonFlow
        v-else-if="flow.syncEnabled"
        :collection="flow.collection"
        :label-field="flow.labelField ?? 'title'"
        :parent-field="flow.parentField ?? 'parentId'"
        :position-field="flow.positionField ?? 'position'"
        sync
        :flow-id="flowId"
        :minimap="true"
        class="h-full w-full"
      />

      <CroutonFlow
        v-else
        :rows="rows"
        :collection="flow.collection"
        :label-field="flow.labelField ?? 'title'"
        :parent-field="flow.parentField ?? 'parentId'"
        :position-field="flow.positionField ?? 'position'"
        :flow-id="flowId"
        :saved-positions="flow.nodePositions"
        :minimap="true"
        class="h-full w-full"
      />
    </div>
  </div>

  <!-- Edit modal -->
  <UModal v-model:open="isEditOpen" title="Configure Flow">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField label="Name" required>
          <UInput v-model="editForm.name" class="w-full" />
        </UFormField>

        <UFormField label="Description">
          <UInput v-model="editForm.description" class="w-full" />
        </UFormField>

        <UFormField label="Collection" required>
          <UInput v-model="editForm.collection" class="w-full" />
        </UFormField>

        <USeparator />

        <p class="text-xs font-medium text-muted uppercase tracking-wide">Field mapping</p>

        <div class="grid grid-cols-3 gap-3">
          <UFormField label="Label field">
            <UInput v-model="editForm.labelField" class="w-full" />
          </UFormField>
          <UFormField label="Parent field">
            <UInput v-model="editForm.parentField" class="w-full" />
          </UFormField>
          <UFormField label="Position field">
            <UInput v-model="editForm.positionField" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Live sync">
          <div class="flex items-center gap-2">
            <USwitch v-model="editForm.syncEnabled" />
            <span class="text-sm text-muted">Enable real-time multiplayer sync</span>
          </div>
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="isEditOpen = false">Cancel</UButton>
        <UButton :loading="editPending" @click="handleEdit">Save changes</UButton>
      </div>
    </template>
  </UModal>
</template>
