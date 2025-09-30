<script setup lang="ts">
import type { ColorName } from '../composables/useThemeState'

const { theme, updateColor } = useThemeState()
const { presets, applyPreset, applyRandomTheme } = usePresets()

const colorLabels: Record<ColorName, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  success: 'Success',
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  neutral: 'Neutral'
}

const tailwindColors = [
  'slate', 'gray', 'zinc', 'neutral', 'stone',
  'red', 'orange', 'amber', 'yellow', 'lime', 'green',
  'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo',
  'violet', 'purple', 'fuchsia', 'pink', 'rose'
]
</script>

<template>
  <div class="p-6 space-y-8">
    <!-- Colors Section -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span class="text-xl">🎨</span>
        Colors
      </h2>

      <div class="space-y-4">
        <div
          v-for="(colorName, key) in colorLabels"
          :key="key"
          class="space-y-2"
        >
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ colorName }}
          </label>
          <select
            :value="theme.colors[key as ColorName]"
            @change="updateColor(key as ColorName, ($event.target as HTMLSelectElement).value)"
            class="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option
              v-for="color in tailwindColors"
              :key="color"
              :value="color"
            >
              {{ color }}
            </option>
          </select>
          <div class="flex gap-1">
            <div
              v-for="shade in ['300', '500', '700']"
              :key="shade"
              :class="`bg-${theme.colors[key as ColorName]}-${shade}`"
              class="h-6 flex-1 rounded"
            />
          </div>
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Presets Section -->
    <section>
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span class="text-xl">🎭</span>
        Presets
      </h2>

      <div class="space-y-2">
        <UButton
          v-for="preset in presets"
          :key="preset.id"
          variant="outline"
          color="gray"
          block
          @click="applyPreset(preset.id)"
        >
          <span class="flex items-center justify-between w-full">
            <span class="font-medium">{{ preset.name }}</span>
            <span class="text-xs text-gray-500">{{ preset.description }}</span>
          </span>
        </UButton>

        <USeparator class="my-4" />

        <UButton
          icon="i-heroicons-sparkles"
          variant="outline"
          color="primary"
          block
          @click="applyRandomTheme"
        >
          Surprise Me!
        </UButton>
      </div>
    </section>

    <USeparator />

    <!-- Info Section -->
    <section class="text-xs text-gray-500 dark:text-gray-400 space-y-2">
      <p>
        <strong>Keyboard Shortcuts:</strong>
      </p>
      <ul class="space-y-1 pl-4">
        <li>• Cmd/Ctrl + Z: Undo</li>
        <li>• Cmd/Ctrl + Shift + Z: Redo</li>
      </ul>
    </section>
  </div>
</template>