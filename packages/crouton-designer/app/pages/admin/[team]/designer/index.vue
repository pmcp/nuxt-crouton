<script setup lang="ts">
import type { DesignerProject } from '../../../../types/schema'

definePageMeta({
  middleware: ['auth'],
  layout: 'admin'
})

const route = useRoute()
const router = useRouter()
const teamSlug = computed(() => route.params.team as string)
const { buildApiUrl } = useTeamContext()
const { t } = useT()

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
    case '1': return t('designer.phases.intake')
    case '2': return t('designer.phases.collections')
    case '5': return t('designer.phases.review')
    default: return t('designer.phases.unknown')
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('designer.schemaDesigner')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #trailing>
          <UButton
            icon="i-lucide-plus"
            :label="t('designer.newProject')"
            :to="`/admin/${teamSlug}/designer/new`"
          />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="max-w-4xl mx-auto px-4 py-8">
        <!-- Loading -->
        <div v-if="status === 'pending'" class="space-y-3">
          <USkeleton v-for="i in 3" :key="i" class="h-20 w-full rounded-lg" />
        </div>

        <!-- Empty state -->
        <div
          v-else-if="sortedProjects.length === 0"
          class="text-center py-16 border border-dashed border-[var(--ui-border)] rounded-lg"
        >
          <UIcon name="i-lucide-layout-grid" class="size-12 mx-auto mb-3 text-[var(--ui-text-muted)] opacity-50" />
          <p class="text-[var(--ui-text-muted)]">
            {{ t('designer.noProjects') }}
          </p>
          <UButton
            class="mt-4"
            :label="t('designer.createFirstProject')"
            variant="outline"
            :to="`/admin/${teamSlug}/designer/new`"
          />
        </div>

        <!-- Project list -->
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="project in sortedProjects"
            :key="project.id"
            :to="`/admin/${teamSlug}/designer/${project.id}`"
            class="flex items-center gap-4 p-4 rounded-lg border border-[var(--ui-border)] hover:bg-[var(--ui-bg-elevated)] transition-colors"
          >
            <div class="flex-1 min-w-0">
              <h3 class="font-medium truncate">
                {{ project.name || t('designer.untitledProject') }}
              </h3>
              <div class="flex items-center gap-3 mt-1 text-xs text-[var(--ui-text-muted)]">
                <span>{{ useTimeAgo(project.updatedAt).value }}</span>
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
              @click.prevent="deleteTarget = project"
            />
          </NuxtLink>
        </div>

        <!-- Delete confirmation modal -->
        <UModal v-model="showDeleteModal">
          <template #content="{ close }">
            <div class="p-6">
              <h3 class="text-lg font-semibold mb-2">
                {{ t('designer.deleteProject') }}
              </h3>
              <p class="text-sm text-[var(--ui-text-muted)] mb-6">
                {{ t('designer.deleteProjectConfirm', { params: { name: deleteTarget?.name || t('designer.untitledProject') } }) }}
              </p>
              <div class="flex justify-end gap-2">
                <UButton color="neutral" variant="ghost" :label="t('common.cancel')" @click="close" />
                <UButton color="error" :label="t('common.delete')" @click="confirmDelete" />
              </div>
            </div>
          </template>
        </UModal>
      </div>
    </template>
  </UDashboardPanel>
</template>
