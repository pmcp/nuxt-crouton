<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { teamId } = useTeamContext()

const { items: canvases, pending: loading, refresh } = await useCollectionQuery('thinkgraphCanvases')
const { create } = useCollectionMutation('thinkgraphCanvases')

const isCreateOpen = ref(false)
const createForm = reactive({ title: '', epicBrief: '' })
const createPending = ref(false)

async function handleCreate() {
  if (!createForm.title.trim()) return
  createPending.value = true
  try {
    const created = await create({
      title: createForm.title,
      epicBrief: createForm.epicBrief,
      status: 'active',
    })
    isCreateOpen.value = false
    Object.assign(createForm, { title: '', epicBrief: '' })
    await refresh()
    if (created?.id) {
      navigateTo(`/admin/${teamId.value}/canvas/${created.id}`)
    }
  }
  finally {
    createPending.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-6 py-10">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold">Canvases</h1>
        <p class="text-sm text-muted mt-1">One canvas per epic. Coordinate work between humans and AI.</p>
      </div>
      <UButton icon="i-lucide-plus" label="New Canvas" @click="isCreateOpen = true" />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
    </div>

    <!-- Empty -->
    <div v-else-if="!canvases?.length" class="text-center py-16">
      <div class="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        <UIcon name="i-lucide-layout-dashboard" class="size-8 text-muted" />
      </div>
      <h3 class="text-lg font-semibold mb-2">No canvases yet</h3>
      <p class="text-sm text-muted mb-6">Create your first canvas to start coordinating work.</p>
      <UButton icon="i-lucide-plus" label="New Canvas" @click="isCreateOpen = true" />
    </div>

    <!-- Canvas list -->
    <div v-else class="grid gap-4">
      <NuxtLink
        v-for="canvas in canvases"
        :key="canvas.id"
        :to="`/admin/${teamId}/canvas/${canvas.id}`"
        class="block p-5 rounded-xl border border-default bg-default hover:border-primary/50 hover:shadow-sm transition-all"
      >
        <div class="flex items-start justify-between">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold truncate">{{ canvas.title }}</h3>
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                :class="canvas.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'"
              >
                {{ canvas.status }}
              </span>
            </div>
            <p v-if="canvas.epicBrief" class="text-sm text-muted line-clamp-2">
              {{ canvas.epicBrief }}
            </p>
          </div>
          <UIcon name="i-lucide-arrow-right" class="size-4 text-muted shrink-0 mt-1" />
        </div>
      </NuxtLink>
    </div>

    <!-- Create modal -->
    <UModal v-model:open="isCreateOpen">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">New Canvas</h3>
          <div class="flex flex-col gap-4">
            <UFormField label="Title" required>
              <UInput v-model="createForm.title" placeholder="e.g. Auth Rewrite" class="w-full" />
            </UFormField>
            <UFormField label="Epic Brief">
              <UTextarea v-model="createForm.epicBrief" placeholder="What is this epic about?" :rows="3" class="w-full" />
            </UFormField>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" @click="close">Cancel</UButton>
            <UButton
              :loading="createPending"
              :disabled="!createForm.title.trim()"
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
