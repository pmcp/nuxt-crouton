<script setup lang="ts">
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

definePageMeta({ layout: 'admin' })

const { teamId } = useTeamContext()

const { items: projects, pending: loading, refresh } = await useCollectionQuery('thinkgraphProjects')
const { create } = useCollectionMutation('thinkgraphProjects')

// Fetch all work items for status counts
const { data: nodes } = await useFetch<ThinkgraphNode[]>(
  () => `/api/teams/${teamId.value}/thinkgraph-nodes`,
)

// Group status counts by projectId
const statusCountsByProject = computed(() => {
  const map: Record<string, Record<string, number>> = {}
  for (const item of nodes.value || []) {
    if (!item.projectId) continue
    if (!map[item.projectId]) map[item.projectId] = {}
    map[item.projectId][item.status] = (map[item.projectId][item.status] || 0) + 1
  }
  return map
})

const STATUS_PILL: Record<string, string> = {
  active: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
  waiting: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const STATUS_ORDER = ['active', 'waiting', 'blocked', 'done'] as const

const isCreateOpen = ref(false)
const createForm = reactive({ name: '', clientName: '', appId: '', description: '' })
const createPending = ref(false)

async function handleCreate() {
  if (!createForm.name.trim()) return
  createPending.value = true
  try {
    const created = await create({
      name: createForm.name,
      clientName: createForm.clientName || undefined,
      appId: createForm.appId || undefined,
      description: createForm.description || undefined,
      status: 'active',
    })
    isCreateOpen.value = false
    Object.assign(createForm, { name: '', clientName: '', appId: '', description: '' })
    await refresh()
    if (created?.id) {
      navigateTo(`/admin/${teamId.value}/project/${created.id}`)
    }
  }
  finally {
    createPending.value = false
  }
}

const statusStyle = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'paused': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'completed': return 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
    default: return 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">Projects</h1>
        <p class="text-sm text-muted mt-1">One project per crouton app. Pi.dev builds, you steer.</p>
      </div>
      <UButton icon="i-lucide-plus" label="New Project" @click="isCreateOpen = true" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="!projects?.length" class="text-center py-16">
      <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-folder-kanban" class="size-8 text-muted" />
      </div>
      <h3 class="text-lg font-semibold mb-2">No projects yet</h3>
      <p class="text-sm text-muted mb-6">Create your first project to start managing a crouton app.</p>
      <UButton icon="i-lucide-plus" label="New Project" @click="isCreateOpen = true" />
    </div>

    <!-- Project cards -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <NuxtLink
        v-for="project in projects"
        :key="project.id"
        :to="`/admin/${teamId}/project/${project.id}`"
        class="block p-5 rounded-xl border border-default bg-default hover:border-primary/50 hover:shadow-md transition-all group"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold truncate">{{ project.name }}</h3>
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                :class="statusStyle(project.status)"
              >
                {{ project.status }}
              </span>
            </div>
            <p v-if="project.clientName" class="text-xs text-muted">
              {{ project.clientName }}
            </p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="size-4 text-muted shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <p v-if="project.description" class="text-sm text-muted line-clamp-2 mb-3">
          {{ project.description }}
        </p>

        <div class="flex items-center gap-3 text-[11px] text-muted">
          <span v-if="project.appId" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-code" class="size-3" />
            {{ project.appId }}
          </span>
          <span v-if="project.deployUrl" class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-globe" class="size-3" />
            live
          </span>
        </div>

        <!-- Work item status counts -->
        <div v-if="statusCountsByProject[project.id]" class="flex items-center gap-1 mt-3">
          <span
            v-for="status in STATUS_ORDER"
            :key="status"
            v-show="statusCountsByProject[project.id]?.[status]"
            class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            :class="STATUS_PILL[status]"
          >
            {{ statusCountsByProject[project.id]?.[status] }} {{ status }}
          </span>
        </div>
      </NuxtLink>
    </div>

    <!-- Create modal -->
    <UModal v-model:open="isCreateOpen">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">New Project</h3>
          <div class="flex flex-col gap-4">
            <UFormField label="Project Name" required>
              <UInput v-model="createForm.name" placeholder="e.g. Velo Bike Rental" class="w-full" />
            </UFormField>
            <UFormField label="Client Name">
              <UInput v-model="createForm.clientName" placeholder="e.g. Velo BV" class="w-full" />
            </UFormField>
            <UFormField label="App Directory">
              <UInput v-model="createForm.appId" placeholder="e.g. velo (from apps/velo)" class="w-full" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea v-model="createForm.description" placeholder="What does this app do?" :rows="3" class="w-full" />
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
              Create
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
