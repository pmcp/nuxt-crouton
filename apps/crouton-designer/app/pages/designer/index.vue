<script setup lang="ts">
import type { DesignerProject } from '~~/layers/designer/collections/projects/types'

definePageMeta({
  middleware: ['auth'],
  layout: 'designer'
})

const router = useRouter()
const { buildApiUrl } = useTeamContext()

// Load all projects
const { data: projects, status, refresh } = await useFetch<DesignerProject[]>(
  () => buildApiUrl('/designer-projects'),
  { default: () => [] }
)

// Sort by most recently updated
const sortedProjects = computed(() =>
  [...(projects.value || [])].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
)

// Delete project
const deleteTarget = ref<DesignerProject | null>(null)
const showDeleteModal = computed({
  get: () => !!deleteTarget.value,
  set: (val: boolean) => { if (!val) deleteTarget.value = null }
})

async function confirmDelete() {
  if (!deleteTarget.value) return
  await $fetch(buildApiUrl(`/designer-projects/${deleteTarget.value.id}`), {
    method: 'DELETE'
  })
  deleteTarget.value = null
  refresh()
}

function phaseLabel(phase: string) {
  switch (phase) {
    case '1': return 'Intake'
    case '2': return 'Collection Design'
    case '5': return 'Review'
    default: return 'Unknown'
  }
}

function phaseColor(phase: string) {
  switch (phase) {
    case '1': return 'info' as const
    case '2': return 'warning' as const
    case '5': return 'success' as const
    default: return 'neutral' as const
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">
          Schema Designer
        </h1>
        <p class="text-[var(--ui-text-muted)] mt-1">
          Design and generate Crouton applications with AI assistance.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        label="New Project"
        to="/designer/new"
      />
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex justify-center py-16">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-[var(--ui-text-muted)]" />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="sortedProjects.length === 0"
      class="text-center py-16 border border-dashed border-[var(--ui-border)] rounded-lg"
    >
      <UIcon name="i-lucide-layout-grid" class="size-12 mx-auto mb-3 text-[var(--ui-text-muted)] opacity-50" />
      <p class="text-[var(--ui-text-muted)]">
        No projects yet.
      </p>
      <UButton
        class="mt-4"
        label="Create your first project"
        variant="outline"
        to="/designer/new"
      />
    </div>

    <!-- Project list -->
    <div v-else class="space-y-3">
      <div
        v-for="project in sortedProjects"
        :key="project.id"
        class="flex items-center gap-4 p-4 rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] cursor-pointer transition-colors"
        @click="router.push(`/designer/${project.id}`)"
      >
        <div class="flex-1 min-w-0">
          <h3 class="font-medium truncate">
            {{ project.name || 'Untitled Project' }}
          </h3>
          <div class="flex items-center gap-3 mt-1 text-xs text-[var(--ui-text-muted)]">
            <span>Updated {{ new Date(project.updatedAt).toLocaleDateString() }}</span>
          </div>
        </div>
        <UBadge
          :label="phaseLabel(project.currentPhase)"
          :color="phaseColor(project.currentPhase)"
          variant="subtle"
          size="sm"
        />
        <UButton
          icon="i-lucide-trash-2"
          variant="ghost"
          color="neutral"
          size="sm"
          @click.stop="deleteTarget = project"
        />
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model="showDeleteModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">
            Delete Project?
          </h3>
          <p class="text-sm text-[var(--ui-text-muted)] mb-6">
            This will permanently delete "{{ deleteTarget?.name || 'Untitled' }}" and all its collections and fields.
          </p>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" label="Cancel" @click="close" />
            <UButton color="error" label="Delete" @click="confirmDelete" />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
