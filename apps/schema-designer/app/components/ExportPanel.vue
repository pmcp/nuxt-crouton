<script setup lang="ts">
const modelValue = defineModel<boolean>({ default: false })

const { state, isValid, validationErrors } = useSchemaDesigner()
const { exportSchema, exportConfig, exportCliCommand, downloadSchema } = useSchemaExport()

type Tab = 'schema' | 'config' | 'cli'
const activeTab = ref<Tab>('schema')

const tabs: { value: Tab; label: string; icon: string }[] = [
  { value: 'schema', label: 'Schema JSON', icon: 'i-lucide-braces' },
  { value: 'config', label: 'Config', icon: 'i-lucide-settings' },
  { value: 'cli', label: 'CLI Command', icon: 'i-lucide-terminal' }
]

const schemaOutput = computed(() => exportSchema(state.value))
const configOutput = computed(() => exportConfig(state.value))
const cliOutput = computed(() => exportCliCommand(state.value))

const currentOutput = computed(() => {
  switch (activeTab.value) {
    case 'schema': return schemaOutput.value
    case 'config': return configOutput.value
    case 'cli': return cliOutput.value
  }
})

const toast = useToast()

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(currentOutput.value)
    toast.add({
      title: 'Copied!',
      description: 'Content copied to clipboard',
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (e) {
    toast.add({
      title: 'Failed to copy',
      description: 'Could not copy to clipboard',
      icon: 'i-lucide-x',
      color: 'error'
    })
  }
}

function handleDownload() {
  downloadSchema(state.value)
  toast.add({
    title: 'Downloaded!',
    description: `${state.value.collectionName}.json saved`,
    icon: 'i-lucide-download',
    color: 'success'
  })
}
</script>

<template>
  <UModal v-model:open="modelValue" class="max-w-3xl">
    <template #content>
      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Export Schema</h2>
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
              <div class="font-medium text-sm">Schema has issues</div>
              <ul class="text-sm text-[var(--ui-text-muted)] list-disc list-inside mt-1">
                <li v-for="error in validationErrors" :key="error">{{ error }}</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 p-1 bg-[var(--ui-bg-elevated)] rounded-lg">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm
                   transition-colors"
            :class="activeTab === tab.value
              ? 'bg-[var(--ui-bg)] shadow-sm font-medium'
              : 'text-[var(--ui-text-muted)] hover:text-[var(--ui-text)]'"
            @click="activeTab = tab.value"
          >
            <UIcon :name="tab.icon" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Output -->
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
              @click="copyToClipboard"
            />
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2">
          <div class="text-sm text-[var(--ui-text-muted)]">
            <template v-if="activeTab === 'schema'">
              Save as <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">schemas/{{ state.collectionName || 'collection' }}.json</code>
            </template>
            <template v-else-if="activeTab === 'config'">
              Add to your <code class="bg-[var(--ui-bg-elevated)] px-1 rounded">crouton.config.js</code>
            </template>
            <template v-else>
              Run in your project directory
            </template>
          </div>

          <div class="flex gap-2">
            <UButton
              v-if="activeTab === 'schema'"
              variant="outline"
              icon="i-lucide-download"
              :disabled="!isValid"
              @click="handleDownload"
            >
              Download JSON
            </UButton>
            <UButton
              icon="i-lucide-copy"
              @click="copyToClipboard"
            >
              Copy to Clipboard
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
