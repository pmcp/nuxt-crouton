<script setup lang="ts">
import { templates } from '../data/templates'
import type { Template } from '../types/blocks'

const emit = defineEmits<{
  select: [template: Template]
}>()
</script>

<template>
  <div class="template-selector px-4 py-8 max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold">Start building</h2>
      <p class="text-muted mt-2">Pick a template or start from scratch</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="template in templates"
        :key="template.id"
        class="group text-left p-5 rounded-xl border border-default bg-default hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] transition-all duration-200"
        @click="emit('select', template)"
      >
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <UIcon :name="template.icon" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <div class="font-semibold">{{ template.label }}</div>
            <UBadge
              v-if="template.blocks.length > 0"
              variant="subtle"
              color="neutral"
              size="xs"
            >
              {{ template.blocks.length }} blocks
            </UBadge>
          </div>
        </div>
        <p class="text-sm text-muted leading-relaxed">{{ template.description }}</p>
      </button>
    </div>
  </div>
</template>
