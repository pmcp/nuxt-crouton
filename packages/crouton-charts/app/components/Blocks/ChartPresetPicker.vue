<script setup lang="ts">
/**
 * Chart Preset Picker
 *
 * Lists available chart presets registered by installed packages
 * (e.g., crouton-bookings). Reads from the shared 'crouton-chart-presets'
 * state — no direct dependency on @fyit/crouton-charts needed.
 */

interface ChartPresetItem {
  id: string
  name: string
  description?: string
  icon?: string
  package: string
  config: {
    type?: string
    [key: string]: unknown
  }
}

interface Props {
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

// Read from the shared registry state (written by useCroutonChartRegistry in crouton-charts)
const presets = useState<ChartPresetItem[]>('crouton-chart-presets', () => [])

// Group presets by source package for display
const presetsByPackage = computed(() => {
  const groups: Record<string, ChartPresetItem[]> = {}
  for (const preset of presets.value) {
    if (!groups[preset.package]) groups[preset.package] = []
    groups[preset.package]!.push(preset)
  }
  return groups
})

const chartTypeIcon: Record<string, string> = {
  bar: 'i-lucide-chart-bar',
  line: 'i-lucide-chart-line',
  area: 'i-lucide-chart-area',
  donut: 'i-lucide-chart-pie'
}

function getTypeIcon(config: ChartPresetItem['config']) {
  const type = config.type as string | undefined
  return (type && chartTypeIcon[type]) || 'i-lucide-chart-bar'
}

// Display label for package names
function formatPackage(pkg: string) {
  return pkg.replace('crouton-', '').replace(/-/g, ' ')
}
</script>

<template>
  <div class="chart-preset-picker">
    <!-- No presets available -->
    <div
      v-if="presets.length === 0"
      class="flex flex-col items-center gap-2 py-6 text-muted text-center"
    >
      <UIcon name="i-lucide-chart-bar" class="size-8 opacity-30" />
      <p class="text-sm">No chart presets available.</p>
      <p class="text-xs">Install a package with chart presets (e.g., crouton-bookings + crouton-charts).</p>
    </div>

    <!-- Grouped preset list -->
    <template v-for="(pkgPresets, pkg) in presetsByPackage" :key="pkg">
      <div class="mb-3">
        <p class="text-[10px] font-semibold text-muted uppercase tracking-widest mb-1.5 px-0.5">
          {{ formatPackage(pkg) }}
        </p>
        <div class="space-y-1">
          <button
            v-for="preset in pkgPresets"
            :key="preset.id"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all"
            :class="modelValue === preset.id
              ? 'border-primary bg-primary/5'
              : 'border-default hover:border-muted/50 hover:bg-muted/20'"
            @click="emit('update:modelValue', preset.id)"
          >
            <UIcon
              :name="preset.icon || getTypeIcon(preset.config)"
              class="size-4 shrink-0"
              :class="modelValue === preset.id ? 'text-primary' : 'text-muted'"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium leading-tight" :class="modelValue === preset.id ? 'text-primary' : ''">
                {{ preset.name }}
              </p>
              <p v-if="preset.description" class="text-xs text-muted truncate mt-0.5">
                {{ preset.description }}
              </p>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <span
                v-if="preset.config.type"
                class="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted font-medium uppercase"
              >
                {{ preset.config.type }}
              </span>
              <UIcon
                v-if="modelValue === preset.id"
                name="i-lucide-check"
                class="size-3.5 text-primary"
              />
            </div>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>
