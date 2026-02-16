<script setup lang="ts">
definePageMeta({
  middleware: ['auth'],
  layout: 'designer'
})

const router = useRouter()

async function createProject() {
  // TODO: A5.2 - Full project list with CRUD
  // For now, navigate to a placeholder project
  router.push('/designer/new')
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
        @click="createProject"
      />
    </div>

    <!-- Placeholder: project list will be built in A5.2 -->
    <div class="text-center py-16 border border-dashed border-[var(--ui-border)] rounded-lg">
      <UIcon name="i-lucide-layout-grid" class="size-12 mx-auto mb-3 text-[var(--ui-text-muted)] opacity-50" />
      <p class="text-[var(--ui-text-muted)]">
        No projects yet.
      </p>
      <UButton
        class="mt-4"
        label="Create your first project"
        variant="outline"
        @click="createProject"
      />
    </div>
  </div>
</template>
