<script setup lang="ts">
const { projects, loading, fetchProjects, deleteProject } = useSchemaProjects()

// Fetch projects on mount
onMounted(() => {
  fetchProjects()
})

const showDeleteConfirm = ref(false)
const projectToDelete = ref<string | null>(null)

function confirmDelete(id: string) {
  projectToDelete.value = id
  showDeleteConfirm.value = true
}

async function handleDelete() {
  if (projectToDelete.value) {
    await deleteProject(projectToDelete.value)
    showDeleteConfirm.value = false
    projectToDelete.value = null
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString()
}
</script>

<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">Schema Designer</h1>
        <p class="text-[var(--ui-text-muted)] mt-1">
          Design and manage collection schemas
        </p>
      </div>
      <UButton
        to="/schema-designer/new"
        icon="i-lucide-plus"
      >
        New Project
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="animate-spin text-2xl" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="projects.length === 0"
      class="text-center py-12 border border-dashed border-[var(--ui-border)] rounded-lg"
    >
      <UIcon name="i-lucide-file-json" class="text-4xl text-[var(--ui-text-muted)] mb-4" />
      <h3 class="font-medium mb-2">No projects yet</h3>
      <p class="text-sm text-[var(--ui-text-muted)] mb-4">
        Create your first schema project to get started
      </p>
      <UButton to="/schema-designer/new" icon="i-lucide-plus">
        Create Project
      </UButton>
    </div>

    <!-- Projects Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <UCard
        v-for="project in projects"
        :key="project.id"
        class="hover:shadow-md transition-shadow"
      >
        <template #header>
          <div class="flex items-start justify-between">
            <div>
              <h3 class="font-semibold">{{ project.name }}</h3>
              <p class="text-sm text-[var(--ui-text-muted)]">
                {{ project.layerName }}/{{ project.collectionName }}
              </p>
            </div>
            <UDropdownMenu
              :items="[
                [{
                  label: 'Edit',
                  icon: 'i-lucide-pencil',
                  to: `/schema-designer/${project.id}`
                }],
                [{
                  label: 'Delete',
                  icon: 'i-lucide-trash-2',
                  color: 'error',
                  onSelect: () => confirmDelete(project.id)
                }]
              ]"
            >
              <UButton
                variant="ghost"
                color="neutral"
                icon="i-lucide-more-vertical"
                size="xs"
              />
            </UDropdownMenu>
          </div>
        </template>

        <div class="space-y-2 text-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-layers" class="text-[var(--ui-text-muted)]" />
            <span>{{ project.schema?.fields?.length || 0 }} fields</span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-calendar" class="text-[var(--ui-text-muted)]" />
            <span>Updated {{ formatDate(project.updatedAt) }}</span>
          </div>
        </div>

        <template #footer>
          <div class="flex gap-2">
            <UButton
              :to="`/schema-designer/${project.id}`"
              variant="soft"
              size="sm"
              class="flex-1"
            >
              Open
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-2">Delete Project?</h3>
          <p class="text-[var(--ui-text-muted)] mb-6">
            This action cannot be undone. The project and all its data will be permanently deleted.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showDeleteConfirm = false">
              Cancel
            </UButton>
            <UButton color="error" @click="handleDelete">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
