<script setup lang="ts">
/**
 * CroutonFlowGroupNode — visual container (like FigJam sections).
 *
 * Created by useFlowAutoGroup when two nodes are grouped via drag overlap.
 * Renders as a dashed, semi-transparent rectangle with a label header.
 * Resizable via @vue-flow/node-resizer.
 */
import { NodeResizer } from '@vue-flow/node-resizer'
import '@vue-flow/node-resizer/dist/style.css'

interface Props {
  data: {
    label: string
    [key: string]: unknown
  }
  selected?: boolean
}

defineProps<Props>()
</script>

<template>
  <div
    class="crouton-flow-group"
    :class="{ 'crouton-flow-group--selected': selected }"
  >
    <NodeResizer
      :min-width="250"
      :min-height="150"
      color="transparent"
    />
    <div class="crouton-flow-group__header">
      <span class="crouton-flow-group__label">{{ data.label }}</span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
@reference "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

.crouton-flow-group {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 12px;
  border: 2px dashed #9ca3af;
  background-color: rgba(219, 234, 254, 0.3);
  transition: border-color 0.2s, box-shadow 0.2s;
}

:where(.dark, .dark *) .crouton-flow-group {
  background-color: rgba(30, 58, 138, 0.15);
  border-color: #4b5563;
}

.crouton-flow-group--selected {
  border-color: var(--color-primary-500, #3b82f6);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary-500, #3b82f6) 15%, transparent);
}

.crouton-flow-group__header {
  position: absolute;
  top: 8px;
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  z-index: 1;
}

.crouton-flow-group__label {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

:where(.dark, .dark *) .crouton-flow-group__label {
  color: #9ca3af;
}
</style>
