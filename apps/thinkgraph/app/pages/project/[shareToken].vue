<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const shareToken = computed(() => route.params.shareToken as string)

const { data, error } = await useFetch(
  () => `/api/public/project/${shareToken.value}`,
)

const project = computed(() => data.value?.project)
const workItems = computed(() => data.value?.workItems || [])

// ─── View toggle ───
const viewMode = ref<'progress' | 'preview' | 'docs'>('progress')
const searchQuery = ref('')

// ─── Work item tree ───
interface TreeNode {
  id: string
  title: string
  type: string
  status: string
  brief?: string
  output?: string
  parentId?: string
  assignee?: string
  deployUrl?: string
  retrospective?: string
  summary?: string
  template?: string
  children: TreeNode[]
}

// ─── Search filtering ───
function matchesSearch(item: any, q: string): boolean {
  return (item.title?.toLowerCase().includes(q))
    || (item.brief?.toLowerCase().includes(q))
    || (item.output?.toLowerCase().includes(q))
    || (item.summary?.toLowerCase().includes(q))
}

const filteredIds = computed((): Set<string> | null => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return null
  const items = workItems.value as any[]
  const ids = new Set<string>()
  for (const item of items) {
    if (matchesSearch(item, q)) {
      ids.add(item.id)
      // Walk up parent chain to keep tree coherent
      let cur = item
      while (cur.parentId) {
        ids.add(cur.parentId)
        cur = items.find((i: any) => i.id === cur.parentId)
        if (!cur) break
      }
    }
  }
  return ids
})

const tree = computed((): TreeNode[] => {
  const items = workItems.value as any[]
  const ids = filteredIds.value
  const filtered = ids ? items.filter((i: any) => ids.has(i.id)) : items
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const item of filtered) {
    map.set(item.id, { ...item, children: [] })
  }

  for (const item of filtered) {
    const node = map.get(item.id)!
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
})

// ─── Docs items (completed nodes with output) ───
const docsItems = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return (workItems.value as any[])
    .filter((item: any) => {
      if (item.status !== 'done' || !item.output) return false
      if (!q) return true
      return matchesSearch(item, q)
    })
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
})

// ─── Status config ───
const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  discover: { icon: 'i-lucide-search', color: 'text-violet-500' },
  architect: { icon: 'i-lucide-pencil-ruler', color: 'text-blue-500' },
  generate: { icon: 'i-lucide-hammer', color: 'text-amber-500' },
  compose: { icon: 'i-lucide-layout', color: 'text-cyan-500' },
  review: { icon: 'i-lucide-eye', color: 'text-green-500' },
  deploy: { icon: 'i-lucide-rocket', color: 'text-rose-500' },
}

const STATUS_CONFIG: Record<string, { icon: string; label: string; class: string }> = {
  queued: { icon: 'i-lucide-circle-dashed', label: 'Queued', class: 'text-neutral-400' },
  active: { icon: 'i-lucide-loader-2', label: 'In progress', class: 'text-primary-500 animate-spin' },
  waiting: { icon: 'i-lucide-pause-circle', label: 'Waiting', class: 'text-amber-500' },
  done: { icon: 'i-lucide-check-circle', label: 'Done', class: 'text-green-500' },
  blocked: { icon: 'i-lucide-alert-circle', label: 'Blocked', class: 'text-red-500' },
  rejected: { icon: 'i-lucide-ban', label: 'Rejected', class: 'text-neutral-400' },
}

// ─── Feedback ───
const feedbackText = ref('')
const feedbackAuthor = ref('')
const feedbackSending = ref(false)
const feedbackSent = ref(false)
const toast = useToast()

async function submitFeedback() {
  if (!feedbackText.value.trim()) return
  feedbackSending.value = true
  try {
    await $fetch(`/api/public/project/${shareToken.value}/feedback`, {
      method: 'POST',
      body: {
        feedback: feedbackText.value.trim(),
        author: feedbackAuthor.value.trim() || undefined,
      },
    })
    feedbackSent.value = true
    feedbackText.value = ''
    toast.add({ title: 'Feedback submitted!', color: 'success' })
  } catch (err: any) {
    toast.add({ title: 'Failed to submit feedback', description: err.message, color: 'error' })
  } finally {
    feedbackSending.value = false
  }
}

// ─── Progress stats ───
const stats = computed(() => {
  const items = workItems.value as any[]
  const total = items.length
  const done = items.filter((i: any) => i.status === 'done').length
  const active = items.filter((i: any) => i.status === 'active').length
  const waiting = items.filter((i: any) => i.status === 'waiting').length
  return { total, done, active, waiting, percent: total > 0 ? Math.round((done / total) * 100) : 0 }
})

useHead({
  title: computed(() => project.value?.name ? `${project.value.name} — Project Progress` : 'Project Progress'),
})
</script>

<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <!-- Error state -->
    <div v-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <UIcon name="i-lucide-lock" class="size-12 text-neutral-300 mb-4" />
        <h1 class="text-xl font-semibold mb-2">Project not found</h1>
        <p class="text-sm text-muted">This link may be invalid or expired.</p>
      </div>
    </div>

    <template v-else-if="project">
      <!-- Header -->
      <header class="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div class="max-w-4xl mx-auto px-6 py-6">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-2xl font-bold">{{ project.name }}</h1>
              <p v-if="project.clientName" class="text-sm text-muted mt-1">{{ project.clientName }}</p>
              <p v-if="project.description" class="text-sm text-muted mt-2 max-w-xl">{{ project.description }}</p>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="project.status === 'active' ? 'primary' : project.status === 'completed' ? 'success' : 'neutral'" variant="subtle">
                {{ project.status }}
              </UBadge>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mt-6">
            <div class="flex items-center justify-between text-sm mb-2">
              <span class="text-muted">Progress</span>
              <span class="font-medium">{{ stats.percent }}% complete</span>
            </div>
            <div class="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
              <div
                class="h-full rounded-full bg-green-500 transition-all duration-500"
                :style="{ width: stats.percent + '%' }"
              />
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-muted">
              <span>{{ stats.done }}/{{ stats.total }} tasks done</span>
              <span v-if="stats.active > 0" class="text-primary-500">{{ stats.active }} in progress</span>
              <span v-if="stats.waiting > 0" class="text-amber-500">{{ stats.waiting }} waiting</span>
            </div>
          </div>

          <!-- View toggle -->
          <div class="mt-4 flex gap-2">
            <UButton
              :variant="viewMode === 'progress' ? 'solid' : 'ghost'"
              size="sm"
              icon="i-lucide-list"
              label="Progress"
              @click="viewMode = 'progress'"
            />
            <UButton
              :variant="viewMode === 'docs' ? 'solid' : 'ghost'"
              size="sm"
              icon="i-lucide-file-text"
              label="Docs"
              @click="viewMode = 'docs'"
            />
            <UButton
              v-if="project.deployUrl"
              :variant="viewMode === 'preview' ? 'solid' : 'ghost'"
              size="sm"
              icon="i-lucide-globe"
              label="Live Preview"
              @click="viewMode = 'preview'"
            />
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="max-w-4xl mx-auto px-6 py-8">
        <!-- Search -->
        <div class="mb-6">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search across all content..."
            size="lg"
            class="w-full"
          />
        </div>

        <!-- Live preview iframe -->
        <div v-if="viewMode === 'preview' && project.deployUrl" class="mb-8">
          <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-white dark:bg-neutral-900">
            <div class="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div class="flex gap-1.5">
                <div class="size-3 rounded-full bg-red-400" />
                <div class="size-3 rounded-full bg-amber-400" />
                <div class="size-3 rounded-full bg-green-400" />
              </div>
              <span class="text-xs text-muted flex-1 text-center truncate">{{ project.deployUrl }}</span>
            </div>
            <iframe
              :src="project.deployUrl"
              class="w-full h-[600px] border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>

        <!-- Progress view -->
        <div v-if="viewMode === 'progress'">
          <div class="space-y-3">
            <template v-for="node in tree" :key="node.id">
              <WorkItemTreeNode :node="node" :depth="0" :type-config="TYPE_CONFIG" :status-config="STATUS_CONFIG" :search-query="searchQuery" />
            </template>
          </div>

          <div v-if="!workItems.length" class="text-center py-12">
            <UIcon name="i-lucide-clock" class="size-8 text-neutral-300 mb-3" />
            <p class="text-muted">No tasks yet — work will appear here soon.</p>
          </div>

          <div v-if="workItems.length && !tree.length" class="text-center py-12">
            <UIcon name="i-lucide-search-x" class="size-8 text-neutral-300 mb-3" />
            <p class="text-muted">No results matching "{{ searchQuery }}"</p>
          </div>
        </div>

        <!-- Docs view -->
        <div v-if="viewMode === 'docs'">
          <ProjectDocs :work-items="docsItems" :search-query="searchQuery" />
        </div>

        <!-- Feedback section -->
        <div class="mt-12 border-t border-neutral-200 dark:border-neutral-800 pt-8">
          <h2 class="text-lg font-semibold mb-4">Leave Feedback</h2>

          <div v-if="feedbackSent" class="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check-circle" class="size-5 text-green-500" />
              <p class="text-sm text-green-700 dark:text-green-300">Thanks for your feedback! We'll review it shortly.</p>
            </div>
            <UButton variant="ghost" size="sm" class="mt-2" @click="feedbackSent = false">
              Send more feedback
            </UButton>
          </div>

          <div v-else class="space-y-4">
            <UFormField label="Your name (optional)">
              <UInput v-model="feedbackAuthor" placeholder="e.g. Sarah" class="max-w-xs" />
            </UFormField>
            <UFormField label="Feedback">
              <UTextarea
                v-model="feedbackText"
                placeholder="What would you like to change? What's working well?"
                :rows="4"
                class="w-full"
              />
            </UFormField>
            <UButton
              icon="i-lucide-send"
              label="Submit Feedback"
              :loading="feedbackSending"
              :disabled="!feedbackText.trim()"
              @click="submitFeedback"
            />
          </div>
        </div>
      </main>

      <!-- Footer -->
      <footer class="border-t border-neutral-200 dark:border-neutral-800 mt-12">
        <div class="max-w-4xl mx-auto px-6 py-4 text-center text-xs text-muted">
          Powered by ThinkGraph
        </div>
      </footer>
    </template>
  </div>
</template>
