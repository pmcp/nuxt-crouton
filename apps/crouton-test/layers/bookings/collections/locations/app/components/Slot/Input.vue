<script setup lang="ts">
import { nanoid } from 'nanoid'

interface BookingsLocationsSlotItem {
  id: string
  label?: string
  value?: string
  capacity?: number
}

const model = defineModel<BookingsLocationsSlotItem>()

// Ensure stable ID on first creation
if (model.value && !model.value.id) {
  model.value = { ...model.value, id: nanoid() }
}

const hasCapacity = computed(() => (model.value?.capacity ?? 1) > 1)
</script>

<template>
  <div class="flex items-center gap-2 w-full">
    <UFormField class="flex-1">
      <UInput
        v-model="model.label"
        class="w-full"
        size="xl"
        placeholder="Enter label"
      />
    </UFormField>
    <UFormField class="w-24">
      <UInputNumber
        v-model="model.capacity"
        size="xl"
        :min="1"
        placeholder="1"
      />
    </UFormField>
    <span class="text-xs text-muted whitespace-nowrap" :class="hasCapacity ? 'text-primary' : ''">
      {{ hasCapacity ? `${model.capacity} spots` : '1 spot' }}
    </span>
  </div>
</template>
