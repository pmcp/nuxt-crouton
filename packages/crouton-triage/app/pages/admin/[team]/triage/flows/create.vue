<script setup lang="ts">
/**
 * Create Flow Page
 *
 * Simple name input that creates a flow and redirects to the edit page.
 *
 * @route /admin/[team]/triage/flows/create
 */

const { currentTeam } = useTeam()
const router = useRouter()
const toast = useToast()

const flowName = ref('')
const creating = ref(false)

async function handleCreate() {
  if (!flowName.value.trim() || !currentTeam.value?.id) return

  creating.value = true
  try {
    const created = await $fetch<{ id: string }>(`/api/teams/${currentTeam.value.id}/triage-flows`, {
      method: 'POST',
      body: {
        name: flowName.value.trim(),
        active: false,
        onboardingComplete: false,
        aiEnabled: true,
      },
    })

    router.push(`/admin/${currentTeam.value.slug}/triage/flows/${created.id}`)
  } catch (error: any) {
    toast.add({
      title: 'Failed to create flow',
      description: error.data?.message || error.message || 'Something went wrong.',
      color: 'error',
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="h-full p-4 flex items-start justify-center pt-16">
    <div v-if="currentTeam?.id" class="w-full max-w-md space-y-6">
      <div>
        <h2 class="text-xl font-semibold">Create Flow</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Give your flow a name, then configure inputs, AI, and outputs.
        </p>
      </div>

      <form class="space-y-4" @submit.prevent="handleCreate">
        <UFormField label="Flow Name">
          <UInput
            v-model="flowName"
            placeholder="e.g. Design Feedback, Support Triage..."
            autofocus
            size="lg"
          />
        </UFormField>

        <div class="flex gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :to="`/admin/${currentTeam.slug}/triage/flows`"
          >
            Cancel
          </UButton>
          <UButton
            type="submit"
            color="primary"
            :loading="creating"
            :disabled="!flowName.trim()"
          >
            Create Flow
          </UButton>
        </div>
      </form>
    </div>

    <div v-else class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  </div>
</template>
