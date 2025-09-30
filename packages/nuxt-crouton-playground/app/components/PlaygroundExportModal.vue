<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const { generateAppConfig, generateAdvancedCSS, generateTailwindConfig, exportAsJSON, copyToClipboard, copied } = useThemeExport()
const { theme } = useThemeState()

const exportFormat = ref<'app-config' | 'advanced-css' | 'tailwind' | 'json'>('app-config')

const exportCode = computed(() => {
  switch (exportFormat.value) {
    case 'app-config':
      return generateAppConfig()
    case 'advanced-css':
      return generateAdvancedCSS()
    case 'tailwind':
      return generateTailwindConfig(theme.value.customPalettes)
    case 'json':
      return exportAsJSON()
    default:
      return ''
  }
})

const handleCopy = async () => {
  await copyToClipboard(exportCode.value)
}
</script>

<template>
  <UModal v-model="isOpen">
    <template #content="{ close }">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-default">
            Export Theme
          </h3>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <!-- Export Format Selector -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-default mb-2">
            Export Format
          </label>
          <UTabs
            :items="[
              { label: 'app.config.ts', value: 'app-config' },
              { label: 'Advanced CSS', value: 'advanced-css' },
              { label: 'Tailwind Config', value: 'tailwind' },
              { label: 'JSON', value: 'json' }
            ]"
            v-model="exportFormat"
          />
        </div>

        <!-- Code Preview -->
        <div class="relative">
          <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96">
            <pre class="text-sm text-gray-100 font-mono"><code>{{ exportCode }}</code></pre>
          </div>
          <UButton
            icon="i-lucide-clipboard"
            size="sm"
            color="primary"
            class="absolute top-2 right-2"
            @click="handleCopy"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </UButton>
        </div>

        <!-- Instructions -->
        <div class="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-900 dark:text-blue-100">
            <template v-if="exportFormat === 'app-config'">
              Copy this code to your <code class="font-mono bg-elevated px-1 py-0.5 rounded">app.config.ts</code> file to apply the theme colors.
            </template>
            <template v-else-if="exportFormat === 'advanced-css'">
              Copy this CSS to your <code class="font-mono bg-elevated px-1 py-0.5 rounded">assets/css/main.css</code> file to apply advanced settings (typography, spacing).
            </template>
            <template v-else-if="exportFormat === 'tailwind'">
              Copy this code to your <code class="font-mono bg-elevated px-1 py-0.5 rounded">tailwind.config.ts</code> file for custom palettes.
            </template>
            <template v-else>
              Save this JSON to restore the theme later or share with others. Includes colors and advanced settings.
            </template>
          </p>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <UButton color="neutral" variant="ghost" @click="close">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
