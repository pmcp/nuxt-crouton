<script setup lang="ts">
import { useThemeSwitcher, type ThemeName } from '../composables/useThemeSwitcher'

interface Props {
  /** Show as dropdown menu (default) or inline buttons */
  mode?: 'dropdown' | 'inline' | 'cycle'
  /** Size of the switcher */
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'dropdown',
  size: 'sm'
})

const { currentTheme, currentThemeConfig, themes, setTheme, cycleTheme } = useThemeSwitcher()

// Dropdown menu items
const menuItems = computed(() =>
  themes.map(theme => ({
    label: theme.label,
    click: () => setTheme(theme.name),
    active: currentTheme.value === theme.name
  }))
)
</script>

<template>
  <!-- Dropdown Mode -->
  <UDropdownMenu
    v-if="mode === 'dropdown'"
    :items="menuItems"
  >
    <UButton
      color="neutral"
      variant="ghost"
      :size="size"
      icon="i-lucide-palette"
      trailing-icon="i-lucide-chevron-down"
    >
      {{ currentThemeConfig?.label }}
    </UButton>
  </UDropdownMenu>

  <!-- Cycle Mode - Single button that cycles through themes -->
  <UButton
    v-else-if="mode === 'cycle'"
    color="neutral"
    variant="ghost"
    :size="size"
    icon="i-lucide-palette"
    @click="cycleTheme"
  >
    {{ currentThemeConfig?.label }}
  </UButton>

  <!-- Inline Mode - Button group -->
  <UFieldGroup v-else :size="size">
    <UButton
      v-for="theme in themes"
      :key="theme.name"
      :color="currentTheme === theme.name ? 'primary' : 'neutral'"
      :variant="currentTheme === theme.name ? 'solid' : 'ghost'"
      @click="setTheme(theme.name)"
    >
      {{ theme.label }}
    </UButton>
  </UFieldGroup>
</template>
