<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ComponentNodeData, VariantName } from '~/composables/useCanvasNodes'
import { VARIANTS } from '~/composables/useCanvasNodes'

// Import Nuxt UI components from #components (Nuxt's auto-import system)
import {
  UAccordion,
  UAlert,
  UAvatar,
  UAvatarGroup,
  UBadge,
  UBreadcrumb,
  UButton,
  UButtonGroup,
  UCalendar,
  UCard,
  UCarousel,
  UCheckbox,
  UCheckboxGroup,
  UChip,
  UCollapsible,
  UColorPicker,
  UIcon,
  UInput,
  UInputMenu,
  UInputNumber,
  UInputTags,
  UKbd,
  ULink,
  UNavigationMenu,
  UPagination,
  UPinInput,
  UPopover,
  UProgress,
  URadioGroup,
  USelect,
  USelectMenu,
  USeparator,
  USkeleton,
  USlider,
  UStepper,
  USwitch,
  UTable,
  UTabs,
  UTextarea,
  UTimeline,
  UTooltip,
  UTree,
  // Crouton components
  CroutonDarkModeSwitcher,
  CroutonAppearanceSwitcher,
  CroutonDate,
  CroutonTablePagination,
  CroutonFormLayout,
  CroutonTableSearch,
} from '#components'

const props = defineProps<NodeProps<ComponentNodeData>>()

const { updateNodeData, removeNode } = useCanvasNodes()

// Global theme from useThemeSwitcher (for background styling)
const { currentTheme } = useThemeSwitcher()

// Writable computed ref for variant - updates node data on set
const selectedVariant = computed({
  get: () => props.data.variant,
  set: (value: VariantName) => updateNodeData(props.id, { variant: value })
})

// Component map using the imported components
// Using 'any' because Nuxt UI components have complex generic slot types
// that don't match Vue's Component type exactly
const componentMap: Record<string, any> = {
  // Nuxt UI components
  UAccordion,
  UAlert,
  UAvatar,
  UAvatarGroup,
  UBadge,
  UBreadcrumb,
  UButton,
  UButtonGroup,
  UCalendar,
  UCard,
  UCarousel,
  UCheckbox,
  UCheckboxGroup,
  UChip,
  UCollapsible,
  UColorPicker,
  UIcon,
  UInput,
  UInputMenu,
  UInputNumber,
  UInputTags,
  UKbd,
  ULink,
  UNavigationMenu,
  UPagination,
  UPinInput,
  UPopover,
  UProgress,
  URadioGroup,
  USelect,
  USelectMenu,
  USeparator,
  USkeleton,
  USlider,
  UStepper,
  USwitch,
  UTable,
  UTabs,
  UTextarea,
  UTimeline,
  UTooltip,
  UTree,
  // Crouton components
  CroutonDarkModeSwitcher,
  CroutonAppearanceSwitcher,
  CroutonDate,
  CroutonTablePagination,
  CroutonFormLayout,
  CroutonTableSearch,
}

// Get the resolved component
const ResolvedComponent = computed(() => {
  const name = props.data.componentName
  return componentMap[name] || name
})

// Check if component supports slots
const hasSlotContent = computed(() => {
  return props.data.slots && Object.keys(props.data.slots).length > 0
})

// Theme-specific background styles for accurate preview
// Uses global theme from useThemeSwitcher
type ThemeName = 'default' | 'ko' | 'minimal' | 'kr11'
const themeBackgroundStyle = computed(() => {
  const backgrounds: Record<ThemeName, string> = {
    default: '#ffffff',
    ko: 'var(--ko-surface-light, #c7c3c0)',
    minimal: '#ffffff',
    kr11: 'var(--kr-chassis, #e5e2dd)',
  }
  return { backgroundColor: backgrounds[currentTheme.value as ThemeName] || '#ffffff' }
})
</script>

<template>
  <div class="component-node">
    <!-- Header with controls -->
    <div class="component-node-header">
      <span class="font-mono text-xs opacity-70">{{ data.componentName }}</span>

      <div class="flex-1" />

      <!-- Variant selector (theme is global via useThemeSwitcher) -->
      <!-- Stop pointer events to prevent Vue Flow from capturing clicks -->
      <div class="nopan nodrag nowheel" @pointerdown.stop @mousedown.stop>
        <USelectMenu
          v-model="selectedVariant"
          :items="VARIANTS"
          value-key="value"
          size="xs"
          class="w-24"
        />
      </div>

      <!-- Remove button -->
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        color="neutral"
        class="nopan nodrag"
        @click.stop="removeNode(id)"
      />
    </div>

    <!-- Component preview -->
    <div class="component-node-preview" :style="themeBackgroundStyle">
      <component
        :is="ResolvedComponent"
        v-bind="data.props"
        :variant="selectedVariant || undefined"
      >
        <template v-if="hasSlotContent">
          {{ data.slots?.default }}
        </template>
      </component>
    </div>

    <!-- Variant indicator -->
    <div
      v-if="selectedVariant"
      class="px-3 py-1 text-xs text-center border-t border-[var(--ui-border)] opacity-50"
    >
      variant="{{ selectedVariant }}"
    </div>
  </div>
</template>
