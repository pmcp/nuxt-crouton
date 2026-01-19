<script setup lang="ts">
import type { PackageInstance } from '../../types/package-manifest'

const emit = defineEmits<{
  save: []
  export: []
}>()

// Use export generator
const {
  generateNuxtConfig,
  generateCroutonConfig,
  generateSchemaFiles,
  generateCommands,
  generateExportBundle,
  getDownloadableFiles
} = useExportGenerator()

// Use project composer for validation
const {
  projectName,
  baseLayerName,
  packages,
  packageManifests,
  customCollections,
  isValid,
  validationErrors
} = useProjectComposer()

// Tab state
type Tab = 'overview' | 'nuxtConfig' | 'croutonConfig' | 'schemas' | 'commands'
const activeTab = ref<Tab>('overview')

const tabs: { value: Tab; label: string; icon: string }[] = [
  { value: 'overview', label: 'Overview', icon: 'i-lucide-layout-dashboard' },
  { value: 'nuxtConfig', label: 'nuxt.config.ts', icon: 'i-lucide-settings' },
  { value: 'croutonConfig', label: 'crouton.config.js', icon: 'i-lucide-file-code' },
  { value: 'schemas', label: 'Schemas', icon: 'i-lucide-braces' },
  { value: 'commands', label: 'CLI Commands', icon: 'i-lucide-terminal' }
]

// Computed outputs
const nuxtConfigOutput = computed(() => generateNuxtConfig())
const croutonConfigOutput = computed(() => generateCroutonConfig())
const schemaFiles = computed(() => generateSchemaFiles())
const cliCommands = computed(() => generateCommands())

// Get package names for overview
const packageNames = computed(() => {
  return packages.value.map((pkg: PackageInstance) => {
    const manifest = packageManifests.value.get(pkg.packageId)
    return manifest?.name || pkg.packageId
  })
})

// Toast for copy feedback
const toast = useToast()

async function copyToClipboard(content: string, label: string) {
  try {
    await navigator.clipboard.writeText(content)
    toast.add({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
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

function downloadAllFiles() {
  const files = getDownloadableFiles()

  // For now, download each file individually
  // In production, you'd want to use JSZip to create a proper zip file
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
  <div class="flex-1 flex flex-col overflow-hidden bg-[var(--ui-bg)]">
    <!-- Header -->
    <div class="p-6 border-b border-[var(--ui-border)]">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold">Review & Export</h2>
          <p class="text-sm text-[var(--ui-text-muted)] mt-1">
            Review your project configuration before exporting
          </p>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            @click="emit('save')"
          >
            <template #leading>
              <UIcon name="i-lucide-save" />
            </template>
            Save Project
          </UButton>
          <UButton
            :disabled="!isValid"
            @click="downloadAllFiles"
          >
            <template #leading>
              <UIcon name="i-lucide-download" />
            </template>
            Download All Files
          </UButton>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Tab Navigation -->
      <div class="w-64 border-r border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] overflow-y-auto">
        <div class="p-2 space-y-1">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left"
            :class="[
              activeTab === tab.value
                ? 'bg-[var(--ui-primary)]/10 text-[var(--ui-primary)]'
                : 'hover:bg-[var(--ui-bg-accented)] text-[var(--ui-text)]'
            ]"
            @click="activeTab = tab.value"
          >
            <UIcon :name="tab.icon" class="text-lg" />
            <span class="text-sm font-medium">{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- Right: Tab Content -->
      <div class="flex-1 overflow-y-auto">
        <!-- Overview Tab -->
        <div v-if="activeTab === 'overview'" class="p-6 space-y-6">
          <!-- Project Summary Card -->
          <div class="p-6 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
            <h3 class="font-semibold mb-4">Project Summary</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-[var(--ui-text-muted)]">Project Name</p>
                <p class="font-medium">{{ projectName || '—' }}</p>
              </div>
              <div>
                <p class="text-sm text-[var(--ui-text-muted)]">Base Layer</p>
                <p class="font-medium">{{ baseLayerName || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- Packages Card -->
          <div class="p-6 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">Packages</h3>
              <UBadge color="primary" variant="subtle">{{ packages.length }}</UBadge>
            </div>

            <div v-if="packages.length > 0" class="space-y-3">
              <div
                v-for="pkg in packages"
                :key="pkg.packageId"
                class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg)]"
              >
                <UIcon
                  :name="packageManifests.get(pkg.packageId)?.icon || 'i-lucide-package'"
                  class="text-xl text-[var(--ui-primary)]"
                />
                <div class="flex-1">
                  <p class="font-medium">
                    {{ packageManifests.get(pkg.packageId)?.name || pkg.packageId }}
                  </p>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    Layer: {{ pkg.layerName }}
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-[var(--ui-text-muted)]">No packages selected</p>
          </div>

          <!-- Custom Collections Card -->
          <div class="p-6 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">Custom Collections</h3>
              <UBadge color="primary" variant="subtle">{{ customCollections.length }}</UBadge>
            </div>

            <div v-if="customCollections.length > 0" class="space-y-3">
              <div
                v-for="collection in customCollections"
                :key="collection.id"
                class="flex items-center gap-3 p-3 rounded-lg bg-[var(--ui-bg)]"
              >
                <UIcon
                  name="i-lucide-database"
                  class="text-xl text-[var(--ui-text-muted)]"
                />
                <div class="flex-1">
                  <p class="font-medium">{{ collection.collectionName || 'Untitled' }}</p>
                  <p class="text-xs text-[var(--ui-text-muted)]">
                    {{ collection.fields.length }} field{{ collection.fields.length !== 1 ? 's' : '' }}
                  </p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-[var(--ui-text-muted)]">No custom collections</p>
          </div>

          <!-- Validation Status -->
          <div
            v-if="validationErrors.length > 0"
            class="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10"
          >
            <div class="flex items-start gap-3">
              <UIcon name="i-lucide-alert-triangle" class="text-amber-500 text-xl mt-0.5" />
              <div>
                <h4 class="font-medium text-amber-700 dark:text-amber-400">Issues Found</h4>
                <ul class="mt-2 space-y-1 text-sm text-amber-600 dark:text-amber-300">
                  <li v-for="error in validationErrors" :key="error">{{ error }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- nuxt.config.ts Tab -->
        <div v-else-if="activeTab === 'nuxtConfig'" class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold">nuxt.config.ts</h3>
              <p class="text-sm text-[var(--ui-text-muted)]">
                Main Nuxt configuration with extends chain
              </p>
            </div>
            <div class="flex gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                @click="copyToClipboard(nuxtConfigOutput, 'nuxt.config.ts')"
              >
                <template #leading>
                  <UIcon name="i-lucide-copy" />
                </template>
                Copy
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                @click="downloadFile('nuxt.config.ts', nuxtConfigOutput)"
              >
                <template #leading>
                  <UIcon name="i-lucide-download" />
                </template>
                Download
              </UButton>
            </div>
          </div>

          <pre
            class="p-4 rounded-lg bg-[var(--ui-bg-elevated)] overflow-auto text-sm font-mono"
          >{{ nuxtConfigOutput }}</pre>
        </div>

        <!-- crouton.config.js Tab -->
        <div v-else-if="activeTab === 'croutonConfig'" class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold">crouton.config.js</h3>
              <p class="text-sm text-[var(--ui-text-muted)]">
                Crouton CLI configuration for collection generation
              </p>
            </div>
            <div class="flex gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                size="sm"
                @click="copyToClipboard(croutonConfigOutput, 'crouton.config.js')"
              >
                <template #leading>
                  <UIcon name="i-lucide-copy" />
                </template>
                Copy
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                @click="downloadFile('crouton.config.js', croutonConfigOutput)"
              >
                <template #leading>
                  <UIcon name="i-lucide-download" />
                </template>
                Download
              </UButton>
            </div>
          </div>

          <pre
            class="p-4 rounded-lg bg-[var(--ui-bg-elevated)] overflow-auto text-sm font-mono"
          >{{ croutonConfigOutput }}</pre>
        </div>

        <!-- Schemas Tab -->
        <div v-else-if="activeTab === 'schemas'" class="p-6 space-y-6">
          <div>
            <h3 class="font-semibold mb-1">Schema Files</h3>
            <p class="text-sm text-[var(--ui-text-muted)]">
              JSON schema files for custom collections
            </p>
          </div>

          <div v-if="schemaFiles.length > 0" class="space-y-4">
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
                <div class="flex gap-2">
                  <UButton
                    variant="ghost"
                    color="neutral"
                    size="xs"
                    @click="copyToClipboard(file.content, file.filename)"
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
                class="p-4 overflow-auto text-sm font-mono max-h-64 bg-[var(--ui-bg)]"
              >{{ file.content }}</pre>
            </div>
          </div>
          <div v-else class="text-center py-12">
            <UIcon name="i-lucide-file-x" class="text-4xl text-[var(--ui-text-muted)] mb-4" />
            <p class="text-[var(--ui-text-muted)]">No custom collections to export</p>
            <p class="text-sm text-[var(--ui-text-dimmed)]">
              Add custom collections in the Building Blocks step
            </p>
          </div>
        </div>

        <!-- CLI Commands Tab -->
        <div v-else-if="activeTab === 'commands'" class="p-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold">CLI Commands</h3>
              <p class="text-sm text-[var(--ui-text-muted)]">
                Commands to run after exporting your project
              </p>
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              size="sm"
              @click="copyToClipboard(cliCommands.join('\n'), 'CLI commands')"
            >
              <template #leading>
                <UIcon name="i-lucide-copy" />
              </template>
              Copy All
            </UButton>
          </div>

          <div class="space-y-2">
            <div
              v-for="(cmd, index) in cliCommands"
              :key="index"
              class="group flex items-center gap-2"
            >
              <template v-if="cmd.startsWith('#')">
                <p class="text-sm text-[var(--ui-text-muted)] italic py-2">
                  {{ cmd }}
                </p>
              </template>
              <template v-else-if="cmd === ''">
                <div class="h-4" />
              </template>
              <template v-else>
                <code
                  class="flex-1 px-3 py-2 rounded bg-[var(--ui-bg-elevated)] text-sm font-mono"
                >
                  {{ cmd }}
                </code>
                <UButton
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="copyToClipboard(cmd, 'Command')"
                >
                  <UIcon name="i-lucide-copy" />
                </UButton>
              </template>
            </div>
          </div>

          <!-- Instructions -->
          <div class="mt-8 p-4 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
            <h4 class="font-medium mb-2">Setup Instructions</h4>
            <ol class="list-decimal list-inside space-y-2 text-sm text-[var(--ui-text-muted)]">
              <li>Copy the configuration files to your project</li>
              <li>Run the CLI commands to generate collections</li>
              <li>Run <code class="px-1 py-0.5 rounded bg-[var(--ui-bg)]">npx nuxt db generate</code> to generate database schema</li>
              <li>Run <code class="px-1 py-0.5 rounded bg-[var(--ui-bg)]">npx nuxt db migrate</code> to run migrations</li>
              <li>Start your development server with <code class="px-1 py-0.5 rounded bg-[var(--ui-bg)]">pnpm dev</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
