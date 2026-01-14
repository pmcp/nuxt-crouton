<script setup lang="ts">
import type { SchemaFile } from '../../composables/useExportGenerator'

const modelValue = defineModel<boolean>({ default: false })

// Legacy single-collection export
const { state, isValid: legacyIsValid, validationErrors: legacyValidationErrors } = useSchemaDesigner()
const { exportSchema, exportConfig, exportCliCommand, exportCardComponent, downloadSchema, downloadCardComponent } = useSchemaExport()

// New package-aware export
const {
  hasPackages,
  hasCustomCollections,
  isValid: composerIsValid,
  validationErrors: composerValidationErrors
} = useProjectComposer()

const {
  generateNuxtConfig,
  generateCroutonConfig,
  generateSchemaFiles,
  generateCommands,
  getDownloadableFiles
} = useExportGenerator()

// Determine if we're in package mode
const isPackageMode = computed(() => hasPackages.value)

// Use appropriate validation based on mode
const isValid = computed(() => isPackageMode.value ? composerIsValid.value : legacyIsValid.value)
const validationErrors = computed(() => isPackageMode.value ? composerValidationErrors.value : legacyValidationErrors.value)

type Tab = 'schema' | 'card' | 'config' | 'cli' | 'createApp' | 'nuxtConfig' | 'croutonConfig' | 'bundle'
const activeTab = ref<Tab>(isPackageMode.value ? 'nuxtConfig' : 'schema')

// Watch for mode changes and update default tab
watch(isPackageMode, (newValue: boolean) => {
  if (newValue) {
    activeTab.value = 'nuxtConfig'
  } else {
    activeTab.value = 'schema'
  }
})

// Tabs for package mode
const packageTabs: { value: Tab; label: string; icon: string }[] = [
  { value: 'nuxtConfig', label: 'nuxt.config.ts', icon: 'i-lucide-settings' },
  { value: 'croutonConfig', label: 'crouton.config.js', icon: 'i-lucide-file-code' },
  { value: 'schema', label: 'Schemas', icon: 'i-lucide-braces' },
  { value: 'cli', label: 'CLI Commands', icon: 'i-lucide-terminal' },
  { value: 'bundle', label: 'Download', icon: 'i-lucide-download' },
  { value: 'createApp', label: 'Create App', icon: 'i-lucide-rocket' }
]

// Tabs for legacy mode
const legacyTabs: { value: Tab; label: string; icon: string }[] = [
  { value: 'schema', label: 'Schema JSON', icon: 'i-lucide-braces' },
  { value: 'card', label: 'Card.vue', icon: 'i-lucide-layout-template' },
  { value: 'config', label: 'Config', icon: 'i-lucide-settings' },
  { value: 'cli', label: 'CLI Command', icon: 'i-lucide-terminal' },
  { value: 'createApp', label: 'Create App', icon: 'i-lucide-rocket' }
]

const tabs = computed(() => isPackageMode.value ? packageTabs : legacyTabs)

function handleClose() {
  modelValue.value = false
}

// Legacy outputs
const schemaOutput = computed(() => exportSchema(state.value))
const cardOutput = computed(() => exportCardComponent(state.value))
const configOutput = computed(() => exportConfig(state.value))
const cliOutput = computed(() => exportCliCommand(state.value))

// Package mode outputs
const nuxtConfigOutput = computed(() => generateNuxtConfig())
const croutonConfigOutput = computed(() => generateCroutonConfig())
const schemaFiles = computed(() => generateSchemaFiles())
const cliCommands = computed(() => generateCommands())

const currentOutput = computed(() => {
  switch (activeTab.value) {
    case 'schema':
      return isPackageMode.value
        ? schemaFiles.value.map((f: SchemaFile) => f.content).join('\n\n---\n\n')
        : schemaOutput.value
    case 'card': return cardOutput.value
    case 'config': return configOutput.value
    case 'cli':
      return isPackageMode.value
        ? cliCommands.value.join('\n')
        : cliOutput.value
    case 'nuxtConfig': return nuxtConfigOutput.value
    case 'croutonConfig': return croutonConfigOutput.value
    default: return ''
  }
})

const toast = useToast()

async function copyToClipboard(content?: string) {
  const textToCopy = content || currentOutput.value
  try {
    await navigator.clipboard.writeText(textToCopy)
    toast.add({
      title: 'Copied!',
      description: 'Content copied to clipboard',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch {
    toast.add({
      title: 'Failed to copy',
      description: 'Could not copy to clipboard',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  toast.add({
    title: 'Downloaded!',
    description: `${filename} saved`,
    icon: 'i-lucide-download',
    color: 'success'
  })
}

function handleDownload() {
  if (isPackageMode.value) {
    switch (activeTab.value) {
      case 'nuxtConfig':
        downloadFile('nuxt.config.ts', nuxtConfigOutput.value)
        break
      case 'croutonConfig':
        downloadFile('crouton.config.js', croutonConfigOutput.value)
        break
      case 'schema':
        for (const file of schemaFiles.value) {
          downloadFile(file.filename, file.content)
        }
        break
      default:
        break
    }
  } else {
    if (activeTab.value === 'card') {
      downloadCardComponent(state.value)
      toast.add({
        title: 'Downloaded!',
        description: 'Card.vue saved',
        icon: 'i-lucide-download',
        color: 'success'
      })
    } else {
      downloadSchema(state.value)
      toast.add({
        title: 'Downloaded!',
        description: `${state.value.collectionName}.json saved`,
        icon: 'i-lucide-download',
        color: 'success'
      })
    }
  }
}

function downloadAllFiles() {
  const files = getDownloadableFiles()

  for (const file of files) {
    const filename = file.path.split('/').pop() || file.path
    downloadFile(filename, file.content)
  }

  toast.add({
    title: 'Downloaded!',
    description: `${files.length} files downloaded`,
    icon: 'i-lucide-download',
    color: 'success'
  })
}
</script>

<template>
  <UModal v-model:open="modelValue" class="max-w-4xl">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">
              {{ isPackageMode ? 'Export Project' : 'Export Schema' }}
            </h2>
            <p v-if="isPackageMode" class="text-sm text-[var(--ui-text-muted)]">
              Download configuration files for your project
            </p>
          </div>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-x"
            size="sm"
            @click="modelValue = false"
          />
        </div>

        <!-- Validation Errors -->
        <div
          v-if="!isValid"
          class="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
        >
          <div class="flex items-start gap-2">
            <UIcon name="i-lucide-alert-triangle" class="text-amber-500 mt-0.5" />
            <div>
              <div class="font-medium text-sm">
                {{ isPackageMode ? 'Project has issues' : 'Schema has issues' }}
              </div>
              <ul class="text-sm text-[var(--ui-text-muted)] list-disc list-inside mt-1">
                <li v-for="error in validationErrors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 p-1 bg-[var(--ui-bg-elevated)] rounded-lg overflow-x-auto">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm
                   transition-colors whitespace-nowrap"
            :class="activeTab === tab.value
              ? 'bg-[var(--ui-bg)] shadow-sm font-medium'
              : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'"
            @click="activeTab = tab.value"
          >
            <UIcon :name="tab.icon" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Create App Panel -->
        <template v-if="activeTab === 'createApp'">
          <CroutonSchemaDesignerCreateAppPanel @close="handleClose" />
        </template>

        <!-- Bundle Download (Package mode) -->
        <template v-else-if="activeTab === 'bundle' && isPackageMode">
          <div class="space-y-4">
            <div class="p-6 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] text-center">
              <UIcon name="i-lucide-package" class="text-4xl text-[var(--ui-primary)] mb-4" />
              <h3 class="font-semibold mb-2">Download All Files</h3>
              <p class="text-sm text-[var(--ui-text-muted)] mb-4">
                Download all configuration files to set up your project
              </p>

              <div class="flex flex-wrap justify-center gap-2 mb-6">
                <UBadge variant="soft" color="neutral">nuxt.config.ts</UBadge>
                <UBadge variant="soft" color="neutral">crouton.config.js</UBadge>
                <UBadge
                  v-for="file in schemaFiles"
                  :key="file.filename"
                  variant="soft"
                  color="neutral"
                >
                  {{ file.filename }}
                </UBadge>
                <UBadge variant="soft" color="neutral">SETUP.md</UBadge>
              </div>

              <UButton
                size="lg"
                :disabled="!isValid"
                @click="downloadAllFiles"
              >
                <template #leading>
                  <UIcon name="i-lucide-download" />
                </template>
                Download {{ getDownloadableFiles().length }} Files
              </UButton>
            </div>

            <!-- Setup Instructions -->
            <div class="p-4 rounded-lg border border-[var(--ui-border)]">
              <h4 class="font-medium mb-3">After downloading:</h4>
              <ol class="list-decimal list-inside space-y-2 text-sm text-[var(--ui-text-muted)]">
                <li>Copy configuration files to your project root</li>
                <li>Place schema files in the appropriate <code class="px-1 py-0.5 rounded bg-[var(--ui-bg-elevated)]">layers/*/schemas/</code> directories</li>
                <li>Run the CLI commands to generate collections</li>
                <li>Run database migrations</li>
                <li>Start your development server</li>
              </ol>
            </div>
          </div>
        </template>

        <!-- Schema Files (Package mode) -->
        <template v-else-if="activeTab === 'schema' && isPackageMode">
          <div class="space-y-4">
            <div v-if="schemaFiles.length === 0" class="text-center py-8">
              <UIcon name="i-lucide-file-x" class="text-4xl text-[var(--ui-text-muted)] mb-4" />
              <p class="text-[var(--ui-text-muted)]">No custom collections to export</p>
            </div>

            <div
              v-for="file in schemaFiles"
              :key="file.path"
              class="rounded-lg border border-[var(--ui-border)] overflow-hidden"
            >
              <div class="flex items-center justify-between px-4 py-2 bg-[var(--ui-bg-elevated)] border-b border-[var(--ui-border)]">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-file-json" class="text-[var(--ui-text-muted)]" />
                  <span class="text-sm font-medium">{{ file.path }}</span>
                </div>
                <div class="flex gap-1">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyToClipboard(file.content)"
                  >
                    <UIcon name="i-lucide-copy" />
                  </UButton>
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="downloadFile(file.filename, file.content)"
                  >
                    <UIcon name="i-lucide-download" />
                  </UButton>
                </div>
              </div>
              <pre
                class="p-4 overflow-auto text-sm font-mono max-h-48 bg-[var(--ui-bg)]"
              >{{ file.content }}</pre>
            </div>
          </div>
        </template>

        <!-- Standard Export Output -->
        <template v-else>
          <div class="relative">
            <pre
              class="p-4 bg-[var(--ui-bg-elevated)] rounded-lg overflow-auto max-h-96 text-sm font-mono"
            >{{ currentOutput }}</pre>

            <div class="absolute top-2 right-2 flex gap-1">
              <UButton
                variant="ghost"
                color="neutral"
                size="xs"
                icon="i-lucide-copy"
                @click="copyToClipboard()"
              />
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-2">
            <div class="text-sm text-[var(--ui-text-muted)]">
              <!-- Package mode hints -->
              <template v-if="isPackageMode">
                <template v-if="activeTab === 'nuxtConfig'">
                  Save as <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">nuxt.config.ts</code>
                </template>
                <template v-else-if="activeTab === 'croutonConfig'">
                  Save as <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">crouton.config.js</code>
                </template>
                <template v-else-if="activeTab === 'cli'">
                  Run these commands in your project directory
                </template>
              </template>

              <!-- Legacy mode hints -->
              <template v-else>
                <template v-if="activeTab === 'schema'">
                  Save as <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">schemas/{{ state.collectionName || 'collection' }}.json</code>
                </template>
                <template v-else-if="activeTab === 'card'">
                  Save as <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">layers/{{ state.layerName }}/collections/{{ state.collectionName }}/app/components/Card.vue</code>
                </template>
                <template v-else-if="activeTab === 'config'">
                  Add to your <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">crouton.config.js</code>
                </template>
                <template v-else-if="activeTab === 'cli'">
                  Run in your project directory
                </template>
              </template>
            </div>

            <div class="flex gap-2">
              <UButton
                v-if="(isPackageMode && (activeTab === 'nuxtConfig' || activeTab === 'croutonConfig')) ||
                      (!isPackageMode && (activeTab === 'schema' || activeTab === 'card'))"
                variant="outline"
                icon="i-lucide-download"
                :disabled="!isValid"
                @click="handleDownload"
              >
                Download
              </UButton>
              <UButton
                icon="i-lucide-copy"
                @click="copyToClipboard()"
              >
                Copy to Clipboard
              </UButton>
            </div>
          </div>
        </template>
      </div>
    </template>
  </UModal>
</template>
