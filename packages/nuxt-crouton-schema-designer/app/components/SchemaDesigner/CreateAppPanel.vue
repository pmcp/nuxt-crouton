<script setup lang="ts">
import { GENERATION_STEPS } from '../../types/app-generator'

const emit = defineEmits<{
  close: []
}>()

const { state } = useSchemaDesigner()
const { exportSchema } = useSchemaExport()
const {
  support,
  projectName,
  targetPath,
  folderSelected,
  selectedFolderName,
  isGenerating,
  progress,
  error,
  result,
  selectFolder,
  createApp,
  reset
} = useAppGenerator()

const toast = useToast()

// Form state
const options = ref({
  installDependencies: true,
  dialect: 'sqlite' as const,
  includeAuth: false,
  includeI18n: false,
  hierarchy: state.value.options.hierarchy,
  sortable: state.value.options.sortable,
  seed: state.value.options.seed,
  seedCount: state.value.options.seedCount
})

// Initialize project name from collection
onMounted(() => {
  if (!projectName.value && state.value.collectionName) {
    projectName.value = `${state.value.layerName}-${state.value.collectionName}-app`
  }
})

async function handleSelectFolder() {
  try {
    const name = await selectFolder()
    if (name) {
      toast.add({
        title: 'Folder selected',
        description: `Will create project in: ${name}`,
        icon: 'i-lucide-folder-check',
        color: 'success'
      })
    }
  } catch (e: any) {
    toast.add({
      title: 'Failed to select folder',
      description: e.message,
      icon: 'i-lucide-alert-circle',
      color: 'error'
    })
  }
}

async function handleCreate() {
  if (!targetPath.value) {
    toast.add({
      title: 'No folder selected',
      description: 'Please select a folder or enter a path',
      icon: 'i-lucide-folder-x',
      color: 'warning'
    })
    return
  }

  try {
    const schema = JSON.parse(exportSchema(state.value))

    await createApp({
      projectName: projectName.value,
      targetPath: targetPath.value,
      collectionName: state.value.collectionName,
      layerName: state.value.layerName,
      schema,
      options: options.value
    })

    if (result.value?.success) {
      toast.add({
        title: 'Project created!',
        description: `Created at ${result.value.projectPath}`,
        icon: 'i-lucide-check-circle',
        color: 'success'
      })
    }
  } catch (e: any) {
    toast.add({
      title: 'Failed to create project',
      description: e.message,
      icon: 'i-lucide-x-circle',
      color: 'error'
    })
  }
}

function handleReset() {
  reset()
}

const currentStepIndex = computed(() => {
  return GENERATION_STEPS.findIndex(s => s.id === progress.value.step)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Success State -->
    <div v-if="result?.success" class="space-y-4">
      <div class="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div class="flex items-start gap-3">
          <UIcon name="i-lucide-check-circle" class="text-green-500 text-xl" />
          <div>
            <div class="font-medium">Project Created Successfully!</div>
            <div class="text-sm text-[var(--ui-text-muted)] mt-1">
              {{ result.projectPath }}
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="text-sm font-medium">Next Steps:</div>
        <div class="p-3 bg-[var(--ui-bg-elevated)] rounded-lg font-mono text-sm space-y-1">
          <div>cd {{ projectName }}</div>
          <div v-if="!options.installDependencies">pnpm install</div>
          <div>pnpm dev</div>
        </div>
      </div>

      <div v-if="result.warnings.length > 0" class="space-y-2">
        <div class="text-sm font-medium text-amber-500">Warnings:</div>
        <ul class="text-sm text-[var(--ui-text-muted)] list-disc list-inside">
          <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
        </ul>
      </div>

      <div class="flex gap-2">
        <UButton variant="outline" @click="handleReset">
          Create Another
        </UButton>
        <UButton @click="emit('close')">
          Done
        </UButton>
      </div>
    </div>

    <!-- Generating State -->
    <div v-else-if="isGenerating" class="space-y-4">
      <div class="space-y-3">
        <div
          v-for="(step, index) in GENERATION_STEPS"
          :key="step.id"
          class="flex items-center gap-3 p-2 rounded-lg"
          :class="{
            'bg-[var(--ui-bg-elevated)]': index === currentStepIndex,
            'opacity-50': index > currentStepIndex
          }"
        >
          <div class="w-6 h-6 flex items-center justify-center">
            <UIcon
              v-if="index < currentStepIndex"
              name="i-lucide-check"
              class="text-green-500"
            />
            <UIcon
              v-else-if="index === currentStepIndex"
              name="i-lucide-loader-2"
              class="text-[var(--ui-primary)] animate-spin"
            />
            <div
              v-else
              class="w-2 h-2 rounded-full bg-[var(--ui-border)]"
            />
          </div>
          <div>
            <div class="text-sm font-medium">{{ step.label }}</div>
            <div v-if="index === currentStepIndex" class="text-xs text-[var(--ui-text-muted)]">
              {{ progress.message }}
            </div>
          </div>
        </div>
      </div>

      <div class="h-2 bg-[var(--ui-bg-elevated)] rounded-full overflow-hidden">
        <div
          class="h-full bg-[var(--ui-primary)] transition-all duration-300"
          :style="{ width: `${progress.progress}%` }"
        />
      </div>
    </div>

    <!-- Form State -->
    <template v-else>
      <!-- Error Display -->
      <div
        v-if="error"
        class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
      >
        <div class="flex items-start gap-2">
          <UIcon name="i-lucide-alert-circle" class="text-red-500 mt-0.5" />
          <div class="text-sm">{{ error }}</div>
        </div>
      </div>

      <!-- Project Name -->
      <UFormField label="Project Name" required>
        <UInput
          v-model="projectName"
          placeholder="my-crouton-app"
        />
      </UFormField>

      <!-- Folder Selection -->
      <UFormField label="Target Folder" required>
        <div class="flex gap-2">
          <UInput
            v-model="targetPath"
            placeholder="/Users/you/projects"
            class="flex-1"
          />
          <UButton
            v-if="support.hasNativePicker"
            variant="outline"
            icon="i-lucide-folder-open"
            @click="handleSelectFolder"
          >
            Browse
          </UButton>
        </div>
        <template #hint>
          <div class="space-y-1">
            <div v-if="folderSelected" class="text-green-600 flex items-center gap-1">
              <UIcon name="i-lucide-folder-check" />
              Folder selected: <strong>{{ selectedFolderName }}</strong>
            </div>
            <div v-if="folderSelected" class="text-[var(--ui-text-muted)]">
              Enter the full path to this folder (e.g., /Users/you/projects/{{ selectedFolderName }})
            </div>
            <div v-else-if="!support.hasNativePicker" class="text-amber-500">
              Native folder picker not available. Enter the full path manually.
            </div>
            <div v-else class="text-[var(--ui-text-muted)]">
              Click Browse to select a folder, then enter the full path.
            </div>
          </div>
        </template>
      </UFormField>

      <!-- Database Dialect -->
      <UFormField label="Database">
        <USelect
          v-model="options.dialect"
          :options="[
            { label: 'SQLite (NuxtHub)', value: 'sqlite' },
            { label: 'PostgreSQL', value: 'pg' }
          ]"
        />
      </UFormField>

      <!-- Packages -->
      <UFormField label="Include Packages">
        <div class="space-y-2">
          <UCheckbox
            v-model="options.includeAuth"
            label="Authentication (@friendlyinternet/nuxt-crouton-auth)"
          />
          <UCheckbox
            v-model="options.includeI18n"
            label="Internationalization (@friendlyinternet/nuxt-crouton-i18n)"
          />
        </div>
      </UFormField>

      <!-- Options -->
      <UFormField label="Options">
        <div class="space-y-2">
          <UCheckbox
            v-model="options.installDependencies"
            label="Install dependencies (pnpm install)"
          />
          <UCheckbox
            v-model="options.seed"
            label="Generate seed data"
          />
        </div>
      </UFormField>

      <!-- Seed Count -->
      <UFormField v-if="options.seed" label="Seed Records">
        <UInput
          v-model.number="options.seedCount"
          type="number"
          :min="1"
          :max="1000"
        />
      </UFormField>

      <!-- Summary -->
      <div class="p-3 bg-[var(--ui-bg-elevated)] rounded-lg text-sm space-y-1">
        <div class="font-medium">Will create:</div>
        <div class="text-[var(--ui-text-muted)]">
          <span class="font-mono">{{ targetPath }}/{{ projectName }}</span>
        </div>
        <div class="text-[var(--ui-text-muted)]">
          Layer: <span class="font-mono">{{ state.layerName }}</span> /
          Collection: <span class="font-mono">{{ state.collectionName }}</span>
        </div>
        <div class="text-[var(--ui-text-muted)]">
          Fields: {{ state.fields.length }}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-2">
        <UButton
          variant="outline"
          @click="emit('close')"
        >
          Cancel
        </UButton>
        <UButton
          icon="i-lucide-rocket"
          :disabled="!projectName || !targetPath"
          @click="handleCreate"
        >
          Create Project
        </UButton>
      </div>
    </template>
  </div>
</template>
