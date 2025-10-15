/**
 * Generator for repeater item component placeholder
 * Creates a working Vue component with TODO comments for customization
 */
export function generateRepeaterItemComponent(componentName) {
  return `<script setup lang="ts">
import { nanoid } from 'nanoid'

// TODO: Define your item interface
interface ${componentName}Item {
  id: string
  // Add your fields here, e.g.:
  // label: string
  // value: string
}

const model = defineModel<${componentName}Item>()

// Ensure stable ID on first creation
if (!model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}

// TODO: Add your form fields below
// You can directly bind to nested properties using v-model="model.yourField"
</script>

<template>
  <UFormField>
    <!-- TODO: Add your input fields here -->
    <!-- Example: <UInput v-model="model.label" class="w-full" size="xl" /> -->
    <UInput class="w-full" size="xl" />
  </UFormField>
</template>
`
}
