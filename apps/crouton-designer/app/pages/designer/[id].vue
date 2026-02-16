<script setup lang="ts">
import type { StepperItem } from '@nuxt/ui'

definePageMeta({
  middleware: ['auth'],
  layout: 'designer'
})

const route = useRoute()
const projectId = computed(() => route.params.id as string)

// Phase stepper items - Phase A uses 1, 2, 5
const phases: StepperItem[] = [
  {
    slot: 'intake' as const,
    title: 'Intake',
    description: 'Describe your app',
    icon: 'i-lucide-message-circle',
    value: '1'
  },
  {
    slot: 'collections' as const,
    title: 'Collections',
    description: 'Design your data model',
    icon: 'i-lucide-database',
    value: '2'
  },
  {
    slot: 'review' as const,
    title: 'Review & Generate',
    description: 'Validate and export',
    icon: 'i-lucide-rocket',
    value: '5'
  }
]

const currentPhase = ref<string>('1')
const stepper = useTemplateRef('stepper')

function goToPhase(phase: string) {
  currentPhase.value = phase
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-arrow-left"
          variant="ghost"
          color="neutral"
          to="/designer"
        />
        <h1 class="text-xl font-semibold">
          Schema Designer
        </h1>
      </div>
    </div>

    <!-- Phase stepper -->
    <UStepper
      ref="stepper"
      v-model="currentPhase"
      :items="phases"
      :linear="false"
      class="mb-8"
    >
      <!-- Phase 1: Intake -->
      <template #intake>
        <div class="py-6">
          <div class="text-center text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-message-circle" class="size-12 mx-auto mb-3 opacity-50" />
            <p>Phase 1: App Intake</p>
            <p class="text-sm mt-1">
              Describe your app and the AI will extract configuration.
            </p>
          </div>
        </div>
      </template>

      <!-- Phase 2: Collection Design -->
      <template #collections>
        <div class="py-6">
          <div class="text-center text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-database" class="size-12 mx-auto mb-3 opacity-50" />
            <p>Phase 2: Collection Design</p>
            <p class="text-sm mt-1">
              Design your data model with AI assistance.
            </p>
          </div>
        </div>
      </template>

      <!-- Phase 5: Review & Generate -->
      <template #review>
        <div class="py-6">
          <div class="text-center text-[var(--ui-text-muted)]">
            <UIcon name="i-lucide-rocket" class="size-12 mx-auto mb-3 opacity-50" />
            <p>Phase 5: Review & Generate</p>
            <p class="text-sm mt-1">
              Validate your schema and export.
            </p>
          </div>
        </div>
      </template>
    </UStepper>
  </div>
</template>
