<script setup lang="ts">
import type { AppComposition } from '../types/blocks'

interface Props {
  composition: AppComposition
}

const props = defineProps<Props>()

const isOpen = defineModel<boolean>({ default: false })

const compositionRef = computed(() => props.composition)

const {
  appName,
  effectiveFolderName,
  folderOverride,
  canGenerate,
  artifacts,
  artifactsByCategory,
  status,
  result,
  error,
  generate
} = useAtelierScaffold(compositionRef)

const stepLabels: Record<string, { label: string, icon: string }> = {
  scaffold: { label: 'Scaffold app', icon: 'i-lucide-folder-plus' },
  schemas: { label: 'Write schemas', icon: 'i-lucide-file-json' },
  seedData: { label: 'Write seed data', icon: 'i-lucide-sprout' },
  config: { label: 'Generate config', icon: 'i-lucide-settings' },
  install: { label: 'Install dependencies', icon: 'i-lucide-package' },
  generate: { label: 'Generate collections', icon: 'i-lucide-wand-2' },
  doctor: { label: 'Validate', icon: 'i-lucide-stethoscope' }
}

async function handleGenerate() {
  await generate()
}
</script>

<template>
  <USlideover v-model="isOpen" :ui="{ width: 'max-w-lg' }">
    <template #content="{ close }">
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-center gap-3 p-4 border-b border-default">
          <UIcon name="i-lucide-rocket" class="w-5 h-5 text-primary" />
          <h3 class="font-semibold text-lg flex-1">Generate App</h3>
          <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="close" />
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-4 space-y-6">
          <!-- Summary -->
          <div class="rounded-lg border border-default p-4 space-y-2">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-app-window" class="w-4 h-4 text-muted" />
              <span class="font-medium text-sm">{{ composition.identity.name || 'Unnamed app' }}</span>
            </div>
            <div class="flex gap-3 text-xs text-muted">
              <span>{{ composition.selectedBlocks.length }} blocks</span>
              <span>{{ composition.enabledPackages.length }} packages</span>
            </div>
          </div>

          <!-- Validation -->
          <div v-if="!canGenerate" class="rounded-lg bg-warning/10 border border-warning/30 p-3 text-sm">
            <div class="flex items-center gap-2 text-warning font-medium mb-1">
              <UIcon name="i-lucide-alert-triangle" class="w-4 h-4" />
              Not ready to generate
            </div>
            <ul class="text-xs text-muted space-y-1 ml-6">
              <li v-if="!composition.identity.name">App name is required</li>
              <li v-if="composition.selectedBlocks.length === 0">Add at least one block</li>
            </ul>
          </div>

          <!-- Folder name -->
          <div>
            <UFormField label="Folder name">
              <UInput
                :model-value="effectiveFolderName"
                :color="status === 'conflict' ? 'error' : undefined"
                @update:model-value="folderOverride = ($event as string)"
              />
            </UFormField>
            <p class="text-xs text-muted mt-1">
              Will create <code class="text-primary">apps/{{ effectiveFolderName }}/</code>
            </p>
            <p v-if="status === 'conflict'" class="text-xs text-error mt-1">
              {{ error }}
            </p>
          </div>

          <!-- Artifact preview -->
          <div>
            <h4 class="text-sm font-medium mb-2">Files to create</h4>
            <div class="space-y-3">
              <div v-for="(group, category) in artifactsByCategory" :key="category">
                <div class="flex items-center gap-1.5 mb-1">
                  <UIcon :name="group.icon" class="w-3.5 h-3.5 text-muted" />
                  <span class="text-xs font-medium text-muted uppercase">{{ category }}</span>
                  <UBadge variant="subtle" color="neutral" size="xs">{{ group.items.length }}</UBadge>
                </div>
                <div class="space-y-0.5 ml-5">
                  <div
                    v-for="art in group.items"
                    :key="art.filename"
                    class="text-xs font-mono text-muted"
                  >
                    {{ art.filename }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step results (shown during/after generation) -->
          <div v-if="result" class="space-y-2">
            <h4 class="text-sm font-medium">Steps</h4>
            <div
              v-for="(stepResult, stepKey) in result.steps"
              :key="stepKey"
              class="flex items-center gap-2 text-sm"
            >
              <UIcon
                :name="stepResult.success ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
                :class="stepResult.success ? 'text-success' : 'text-error'"
                class="w-4 h-4 shrink-0"
              />
              <span class="flex-1">{{ stepLabels[stepKey]?.label ?? stepKey }}</span>
              <span
                v-if="stepResult.error"
                class="text-xs text-error truncate max-w-48"
                :title="stepResult.error"
              >
                {{ stepResult.error }}
              </span>
            </div>
          </div>

          <!-- Success state -->
          <div v-if="status === 'done' && result?.success" class="rounded-lg bg-success/10 border border-success/30 p-4">
            <div class="flex items-center gap-2 text-success font-medium mb-2">
              <UIcon name="i-lucide-party-popper" class="w-4 h-4" />
              App created!
            </div>
            <div class="text-xs text-muted space-y-1 font-mono">
              <p>cd apps/{{ effectiveFolderName }}</p>
              <p>pnpm dev</p>
            </div>
          </div>

          <!-- Error state -->
          <div v-if="status === 'error'" class="rounded-lg bg-error/10 border border-error/30 p-3 text-sm text-error">
            {{ error }}
          </div>
        </div>

        <!-- Footer -->
        <div class="p-4 border-t border-default">
          <UButton
            :label="status === 'generating' ? 'Creating...' : status === 'done' ? 'Done' : 'Create App'"
            :loading="status === 'generating'"
            :disabled="!canGenerate || status === 'generating' || status === 'done'"
            color="primary"
            block
            @click="handleGenerate"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
