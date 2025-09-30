<script setup lang="ts">
import type { ColorName } from '../composables/useThemeState'

const { theme, updateColor } = useThemeState()
const { presets, applyPreset, applyRandomTheme } = usePresets()
const { 
  advanced, 
  updateTypography, 
  updateSpacing,
  fontFamilyOptions,
  radiusOptions
} = useAdvancedTheme()

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

const showAdvanced = ref(false)
</script>

<template>
  <div class="p-6 space-y-8">
    <!-- Colors Section -->
    <section>
      <h2 class="text-lg font-semibold text-default mb-4 flex items-center gap-2">
        <span class="text-xl">🎨</span>
        Colors
      </h2>

      <div class="space-y-4">
        <UFormGroup
          v-for="(colorName, key) in colorLabels"
          :key="key"
          :label="colorName"
        >
          <USelect
            :model-value="theme.colors[key as ColorName]"
            :items="tailwindColors"
            @update:model-value="updateColor(key as ColorName, $event)"
          />
          <template #hint>
            <div class="flex gap-1 mt-2">
              <div
                v-for="shade in ['300', '500', '700']"
                :key="shade"
                :class="`bg-${theme.colors[key as ColorName]}-${shade}`"
                class="h-6 flex-1 rounded"
              />
            </div>
          </template>
        </UFormGroup>
      </div>
    </section>

    <USeparator />

    <!-- Presets Section -->
    <section>
      <h2 class="text-lg font-semibold text-default mb-4 flex items-center gap-2">
        <span class="text-xl">🎭</span>
        Presets
      </h2>

      <div class="space-y-2">
        <UButton
          v-for="preset in presets"
          :key="preset.id"
          variant="outline"
          color="neutral"
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
          icon="i-lucide-sparkles"
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

    <!-- Advanced Section -->
    <section>
      <button
        @click="showAdvanced = !showAdvanced"
        class="w-full flex items-center justify-between text-lg font-semibold text-default mb-4"
      >
        <div class="flex items-center gap-2">
          <span class="text-xl">⚙️</span>
          Advanced
        </div>
        <span class="text-gray-500 text-sm">
          {{ showAdvanced ? '▼' : '▶' }}
        </span>
      </button>

      <div v-show="showAdvanced" class="space-y-4">
        <!-- Typography -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-default">
            Typography
          </h3>
          <UFormGroup label="Font Family" size="xs">
            <USelect
              :model-value="advanced.typography.fontFamily"
              :items="fontFamilyOptions"
              value-key="value"
              @update:model-value="updateTypography({ fontFamily: $event })"
            />
          </UFormGroup>
        </div>

        <USeparator />

        <!-- Spacing -->
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-default">
            Spacing
          </h3>
          <UFormGroup label="Border Radius" size="xs">
            <USelect
              :model-value="advanced.spacing.radius"
              :items="radiusOptions"
              value-key="value"
              @update:model-value="updateSpacing({ radius: $event })"
            />
            <template #hint>
              <div class="flex gap-2 mt-2">
                <div
                  v-for="size in ['sm', 'md', 'lg']"
                  :key="size"
                  :style="{ borderRadius: advanced.spacing.radius }"
                  class="h-12 flex-1 bg-primary-500"
                />
              </div>
            </template>
          </UFormGroup>
        </div>

        <div class="text-xs text-muted p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
          <strong>Tip:</strong> Advanced settings apply globally to all UI elements. The "neutral" color controls backgrounds, borders, and text throughout your theme.
        </div>
      </div>
    </section>

    <USeparator />

    <!-- Info Section -->
    <section class="text-xs text-muted space-y-2">
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
