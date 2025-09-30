<script setup lang="ts">
const { colors, setColor, reset, applyPreset, shareTheme, copied } = useTheme()
const { presets, generateRandom } = usePresets()
const { generateAppConfig, copyCode } = useExport()

const colorMode = useColorMode()

const showExportModal = ref(false)
const exportCode = computed(() => generateAppConfig(colors.value))

const handlePresetClick = (preset: typeof presets[0]) => {
  applyPreset(preset.colors)
}

const handleRandomClick = () => {
  applyPreset(generateRandom())
}

const handleCopyExport = async () => {
  await copyCode(exportCode.value)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div class="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">🎨 Nuxt UI Theme Playground</h1>
          <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Experiment with colors and see live results
          </p>
        </div>
        <div class="flex items-center gap-3">
          <UButton
            :icon="colorMode.preference === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
            color="neutral"
            variant="ghost"
            @click="colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'"
          />
          <UButton
            label="Share"
            icon="i-heroicons-share"
            color="neutral"
            @click="shareTheme"
          />
          <UButton
            label="Export"
            icon="i-heroicons-code-bracket"
            color="primary"
            @click="showExportModal = true"
          />
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-[400px_1fr] h-[calc(100vh-89px)]">
      <!-- Control Panel -->
      <aside class="border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
        <div class="p-6 space-y-8">
          <!-- Colors Section -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold">Colors</h2>
              <UButton
                label="Reset"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="reset"
              />
            </div>
            <div class="space-y-4">
              <ColorPicker
                label="Primary"
                color-name="primary"
                :model-value="colors.primary"
                @update:model-value="setColor('primary', $event)"
              />
              <ColorPicker
                label="Secondary"
                color-name="secondary"
                :model-value="colors.secondary"
                @update:model-value="setColor('secondary', $event)"
              />
              <ColorPicker
                label="Success"
                color-name="success"
                :model-value="colors.success"
                @update:model-value="setColor('success', $event)"
              />
              <ColorPicker
                label="Warning"
                color-name="warning"
                :model-value="colors.warning"
                @update:model-value="setColor('warning', $event)"
              />
              <ColorPicker
                label="Error"
                color-name="error"
                :model-value="colors.error"
                @update:model-value="setColor('error', $event)"
              />
              <ColorPicker
                label="Neutral"
                color-name="neutral"
                :model-value="colors.neutral"
                @update:model-value="setColor('neutral', $event)"
              />
            </div>
          </section>

          <USeparator />

          <!-- Presets Section -->
          <section>
            <h2 class="text-lg font-semibold mb-4">Presets</h2>
            <div class="space-y-2">
              <UButton
                v-for="preset in presets"
                :key="preset.name"
                :label="preset.name"
                color="neutral"
                variant="outline"
                block
                @click="handlePresetClick(preset)"
              />
              <UButton
                label="🎲 Surprise Me!"
                color="primary"
                variant="solid"
                block
                @click="handleRandomClick"
              />
            </div>
          </section>
        </div>
      </aside>

      <!-- Preview Canvas -->
      <main class="overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <PreviewCanvas />
      </main>
    </div>

    <!-- Export Modal -->
    <UModal v-model="showExportModal">
      <template #content="{ close }">
        <div class="p-6">
          <h3 class="text-lg font-semibold mb-4">Export Theme</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Copy this code to your <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">app.config.ts</code> file:
          </p>
          <div class="relative">
            <pre class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm overflow-x-auto"><code>{{ exportCode }}</code></pre>
            <UButton
              icon="i-heroicons-clipboard"
              color="neutral"
              size="xs"
              class="absolute top-2 right-2"
              @click="handleCopyExport"
            />
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <UButton color="neutral" variant="ghost" label="Close" @click="close" />
          </div>
        </div>
      </template>
    </UModal>

    <!-- Toast Notifications -->
    <UNotifications>
      <template #title="{ title }">
        {{ title }}
      </template>
      <template #description="{ description }">
        {{ description }}
      </template>
    </UNotifications>
  </div>
</template>