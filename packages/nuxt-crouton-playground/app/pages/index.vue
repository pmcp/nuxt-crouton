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
  <div class="min-h-screen bg-[var(--ui-color-neutral-100)]">
    <!-- Header -->
    <header class="border-b border-default bg-elevated">
      <div class="px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-default">
              🎨 Nuxt Crouton Theme Playground
            </h1>
            <p class="text-sm text-muted mt-1">
              Interactive Nuxt UI theming tool with real-time preview
            </p>
          </div>

          <div class="flex items-center gap-3">
            <!-- Undo/Redo -->
            <div class="flex items-center gap-1">
              <UButton
                icon="i-lucide-undo"
                color="neutral"
                variant="ghost"
                :disabled="!canUndo"
                @click="undo()"
                title="Undo (Cmd+Z)"
              />
              <UButton
                icon="i-lucide-redo"
                color="neutral"
                variant="ghost"
                :disabled="!canRedo"
                @click="redo()"
                title="Redo (Cmd+Shift+Z)"
              />
            </div>

            <USeparator orientation="vertical" class="h-6" />

            <!-- Export -->
            <UButton
              icon="i-lucide-code"
              color="neutral"
              variant="ghost"
              @click="showExportModal = true"
            >
              Export
            </UButton>

            <!-- Share -->
            <UButton
              icon="i-lucide-share"
              color="neutral"
              variant="ghost"
              @click="handleShare"
            >
              {{ copied ? 'Copied!' : 'Share' }}
            </UButton>

            <!-- Color Mode Toggle -->
            <UButton
              :icon="colorMode.value === 'dark' ? 'i-lucide-moon' : 'i-lucide-sun'"
              color="neutral"
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
      <aside class="w-80 border-r border-default bg-elevated overflow-y-auto">
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