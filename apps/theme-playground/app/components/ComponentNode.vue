<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ComponentNodeData, ThemeName, VariantName } from '~/composables/useCanvasNodes'
import { THEMES, VARIANTS } from '~/composables/useCanvasNodes'

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

const { updateNodeData, getComputedVariant, removeNode } = useCanvasNodes()

// Writable computed refs - reactive to prop changes + update node data on set
const selectedTheme = computed({
  get: () => props.data.theme,
  set: (value: ThemeName) => updateNodeData(props.id, { theme: value })
})

const selectedVariant = computed({
  get: () => props.data.baseVariant,
  set: (value: VariantName) => updateNodeData(props.id, { baseVariant: value })
})

// Computed variant for the actual component
const computedVariant = computed(() => {
  return getComputedVariant(selectedTheme.value, selectedVariant.value)
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
const themeBackgroundStyle = computed(() => {
  const backgrounds: Record<ThemeName, string> = {
    default: '#ffffff',
    ko: 'var(--ko-surface-light, #c7c3c0)',
    minimal: '#ffffff',
    kr11: 'var(--kr-chassis, #e5e2dd)',
  }
  return { backgroundColor: backgrounds[selectedTheme.value] || '#ffffff' }
})
</script>

<template>
  <div class="component-node">
    <!-- Header with controls -->
    <div class="component-node-header">
      <span class="font-mono text-xs opacity-70">{{ data.componentName }}</span>

      <div class="flex-1" />

      <!-- Theme selector -->
      <USelectMenu
        v-model="selectedTheme"
        :items="THEMES"
        value-key="value"
        size="xs"
        class="w-20"
      />

      <!-- Variant selector -->
      <USelectMenu
        v-model="selectedVariant"
        :items="VARIANTS"
        value-key="value"
        size="xs"
        class="w-20"
      />

      <!-- Remove button -->
      <UButton
        icon="i-lucide-x"
        variant="ghost"
        size="xs"
        color="neutral"
        @click="removeNode(id)"
      />
    </div>

    <!-- Component preview -->
    <div class="component-node-preview" :style="themeBackgroundStyle">
      <component
        :is="ResolvedComponent"
        v-bind="data.props"
        :variant="computedVariant"
      >
        <template v-if="hasSlotContent">
          {{ data.slots?.default }}
        </template>
      </component>
    </div>

    <!-- Variant indicator -->
    <div
      v-if="computedVariant"
      class="px-3 py-1 text-xs text-center border-t border-[var(--ui-border)] opacity-50"
    >
      variant="{{ computedVariant }}"
    </div>
  </div>
</template>
