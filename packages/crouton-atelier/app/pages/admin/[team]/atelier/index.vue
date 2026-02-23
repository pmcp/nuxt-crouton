<script setup lang="ts">
import type { AtelierProject } from '../../../../types/blocks'

definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const router = useRouter()
const { teamSlug } = useTeamContext()

// Load projects
const { data: projects, status, refresh } = await useFetch<AtelierProject[]>(
  '/api/atelier/projects',
  { default: () => [] }
)

const sortedProjects = computed(() =>
  [...(projects.value || [])].sort((a, b) => b.updatedAt - a.updatedAt)
)

// Create project
const showCreate = ref(false)
const newName = ref('')

async function createProject() {
  if (!newName.value.trim()) return
  const project = await $fetch<AtelierProject>('/api/atelier/projects', {
    method: 'POST',
    body: { name: newName.value.trim() }
  })
  showCreate.value = false
  newName.value = ''
  router.push(`/admin/${teamSlug.value}/atelier/${project.id}`)
}

// Delete project
const deleteTarget = ref<AtelierProject | null>(null)
const showDelete = computed({
  get: () => !!deleteTarget.value,
  set: (val: boolean) => { if (!val) deleteTarget.value = null }
})

async function confirmDelete() {
  if (!deleteTarget.value) return
  await $fetch(`/api/atelier/projects/${deleteTarget.value.id}`, {
    method: 'DELETE'
  })
  deleteTarget.value = null
  refresh()
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold">App Builder</h1>
        <p class="text-muted text-sm mt-1">Create apps by composing blocks</p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="New Project"
        color="primary"
        @click="showCreate = true"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 rounded-lg bg-muted/30 animate-pulse" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!projects?.length"
      class="text-center py-16"
    >
      <UIcon name="i-lucide-blocks" class="w-12 h-12 text-muted mx-auto mb-4" />
      <h3 class="text-lg font-medium mb-2">No projects yet</h3>
      <p class="text-muted text-sm mb-4">Create your first app project</p>
      <UButton
        icon="i-lucide-plus"
        label="New Project"
        color="primary"
        @click="showCreate = true"
      />
    </div>

    <!-- Project list -->
    <div v-else class="space-y-3">
      <div
        v-for="project in sortedProjects"
        :key="project.id"
        class="group flex items-center gap-4 p-4 rounded-lg border border-default hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer"
        @click="router.push(`/admin/${teamSlug}/atelier/${project.id}`)"
      >
        <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-blocks" class="w-5 h-5 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ project.name }}</div>
          <div class="text-xs text-muted mt-0.5">
            Updated {{ formatDate(project.updatedAt) }}
          </div>
        </div>
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="deleteTarget = project"
        />
      </div>
    </div>

    <!-- Create modal -->
    <UModal v-model="showCreate">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">New Project</h3>
          <UFormField label="Project name">
            <UInput
              v-model="newName"
              placeholder="My new app"
              autofocus
              @keydown.enter="createProject"
            />
          </UFormField>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton color="primary" :disabled="!newName.trim()" @click="createProject">Create</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model="showDelete">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">Delete project?</h3>
          <p class="text-sm text-muted mb-6">
            "{{ deleteTarget?.name }}" will be permanently deleted. This cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton color="error" @click="confirmDelete">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
