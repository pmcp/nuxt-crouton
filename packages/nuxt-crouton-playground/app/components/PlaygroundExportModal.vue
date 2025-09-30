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

const { generateAppConfig, generateTailwindConfig, exportAsJSON, copyToClipboard, copied } = useThemeExport()
const { theme } = useThemeState()

const exportFormat = ref<'app-config' | 'tailwind' | 'json'>('app-config')

const exportCode = computed(() => {
  switch (exportFormat.value) {
    case 'app-config':
      return generateAppConfig()
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
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Export Theme
          </h3>
          <UButton
            icon="i-heroicons-x-mark"
            color="gray"
            variant="ghost"
            size="sm"
            @click="close"
          />
        </div>

        <!-- Export Format Selector -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Export Format
          </label>
          <UTabs
            :items="[
              { label: 'app.config.ts', value: 'app-config' },
              { label: 'Tailwind Config', value: 'tailwind' },
              { label: 'JSON', value: 'json' }
            ]"
            v-model="exportFormat"
          />
        </div>

        <!-- Code Preview -->
        <div class="relative">
          <div class="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre class="text-sm text-gray-100 font-mono"><code>{{ exportCode }}</code></pre>
          </div>
          <UButton
            icon="i-heroicons-clipboard"
            size="sm"
            color="white"
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
              Copy this code to your <code class="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded">app.config.ts</code> file to apply the theme.
            </template>
            <template v-else-if="exportFormat === 'tailwind'">
              Copy this code to your <code class="font-mono bg-white dark:bg-gray-800 px-1 py-0.5 rounded">tailwind.config.ts</code> file for custom palettes.
            </template>
            <template v-else>
              Save this JSON to restore the theme later or share with others.
            </template>
          </p>
        </div>

        <div class="flex justify-end gap-2 mt-6">
          <UButton color="gray" variant="ghost" @click="close">
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>