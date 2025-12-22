<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { ComponentNodeData, ThemeName, VariantName } from '~/composables/useCanvasNodes'
import { THEMES, VARIANTS } from '~/composables/useCanvasNodes'

const props = defineProps<NodeProps<ComponentNodeData>>()

const { updateNodeData, getComputedVariant, removeNode } = useCanvasNodes()

// Local state for selectors
const selectedTheme = ref<ThemeName>(props.data.theme)
const selectedVariant = ref<VariantName>(props.data.baseVariant)

// Computed variant for the actual component
const computedVariant = computed(() => {
  return getComputedVariant(selectedTheme.value, selectedVariant.value)
})

// Update node data when selections change
watch([selectedTheme, selectedVariant], ([theme, variant]) => {
  updateNodeData(props.id, { theme, baseVariant: variant })
})

// Resolve all components at setup time from registry
const { componentNames } = useComponentRegistry()
const componentMap: Record<string, ReturnType<typeof resolveComponent>> = Object.fromEntries(
  componentNames.map(name => [name, resolveComponent(name)])
)

// Get the resolved component
const ResolvedComponent = computed(() => {
  return componentMap[props.data.componentName] || props.data.componentName
})

// Check if component supports slots
const hasSlotContent = computed(() => {
  return props.data.slots && Object.keys(props.data.slots).length > 0
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
    <div class="component-node-preview">
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
