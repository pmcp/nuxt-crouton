<script setup lang="ts">
import { nanoid } from 'nanoid'

// TODO: Define your item interface
interface BookingsSettingsGroupItem {
  id: string
  label?: string
  value?: string
  // Add your fields here
}

const model = defineModel<BookingsSettingsGroupItem>()

// Ensure stable ID on first creation
if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}
</script>

<template>
  <UFormField>
    <UInput
      v-model="model.label"
      class="w-full"
      size="xl"
      placeholder="Enter label"
    />
  </UFormField>
</template>
