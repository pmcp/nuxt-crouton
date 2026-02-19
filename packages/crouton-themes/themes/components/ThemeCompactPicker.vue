<script setup lang="ts">
import { useThemeSwitcher } from '../composables/useThemeSwitcher'

interface Props {
  /** Size of each swatch button */
  size?: 'xs' | 'sm' | 'md'
  /** Show theme label next to swatches */
  showLabel?: boolean
  /** Show theme name tooltip on hover */
  tooltip?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  showLabel: false,
  tooltip: true
})

const { currentTheme, themes, setTheme } = useThemeSwitcher()

const sizeClass = computed(() => ({
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5'
}[props.size]))
</script>

<template>
  <div class="flex items-center gap-1.5">
    <span
      v-if="showLabel"
      class="text-xs text-muted font-medium"
    >
      Theme
    </span>

    <div class="flex items-center gap-1">
      <UTooltip
        v-for="theme in themes"
        :key="theme.name"
        :text="tooltip ? theme.label : undefined"
        :delay-duration="300"
      >
        <button
          type="button"
          :aria-label="`Switch to ${theme.label} theme`"
          :aria-pressed="currentTheme === theme.name"
          class="relative rounded-full transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary hover:scale-110 active:scale-95"
          :class="[
            sizeClass,
            currentTheme === theme.name
              ? 'ring-2 ring-offset-1 ring-primary scale-105'
              : 'opacity-70 hover:opacity-100'
          ]"
          @click="setTheme(theme.name)"
        >
          <!-- Split color swatch showing 2 primary colors of the theme -->
          <span class="absolute inset-0 rounded-full overflow-hidden flex">
            <span
              v-for="(color, i) in theme.colors.slice(0, 2)"
              :key="i"
              class="flex-1 h-full"
              :style="{ backgroundColor: color }"
            />
          </span>
        </button>
      </UTooltip>
    </div>
  </div>
</template>
