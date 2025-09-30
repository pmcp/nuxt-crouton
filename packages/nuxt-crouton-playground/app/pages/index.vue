<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

const { theme, undo, canUndo, redo, canRedo } = useThemeState()
const colorMode = useColorMode()
const { shareableUrl } = useUrlTheme()
const { copyToClipboard, copied } = useThemeExport()

const showExportModal = ref(false)

const handleShare = async () => {
  await copyToClipboard(shareableUrl.value)
}

// Keyboard shortcuts

onKeyStroke('z', (e) => {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
    e.preventDefault()
    if (canUndo.value) undo()
  }
})

onKeyStroke('z', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
    e.preventDefault()
    if (canRedo.value) redo()
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              🎨 Nuxt Crouton Theme Playground
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Interactive Nuxt UI theming tool with real-time preview
            </p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Undo/Redo -->
            <div class="flex items-center gap-1">
              <UButton
                icon="i-heroicons-arrow-uturn-left"
                color="gray"
                variant="ghost"
                :disabled="!canUndo"
                @click="undo()"
                title="Undo (Cmd+Z)"
              />
              <UButton
                icon="i-heroicons-arrow-uturn-right"
                color="gray"
                variant="ghost"
                :disabled="!canRedo"
                @click="redo()"
                title="Redo (Cmd+Shift+Z)"
              />
            </div>

            <USeparator orientation="vertical" class="h-6" />

            <!-- Export -->
            <UButton
              icon="i-heroicons-code-bracket"
              color="gray"
              variant="ghost"
              @click="showExportModal = true"
            >
              Export
            </UButton>

            <!-- Share -->
            <UButton
              icon="i-heroicons-share"
              color="gray"
              variant="ghost"
              @click="handleShare"
            >
              {{ copied ? 'Copied!' : 'Share' }}
            </UButton>

            <!-- Color Mode Toggle -->
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-heroicons-moon' : 'i-heroicons-sun'"
              color="gray"
              variant="ghost"
              @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
            />
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="flex h-[calc(100vh-89px)]">
      <!-- Left Panel: Controls -->
      <aside class="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-y-auto">
        <PlaygroundControlPanel />
      </aside>

      <!-- Right Panel: Preview -->
      <main class="flex-1 overflow-y-auto">
        <PlaygroundPreviewCanvas />
      </main>
    </div>

    <!-- Export Modal -->
    <PlaygroundExportModal v-model="showExportModal" />
  </div>
</template>