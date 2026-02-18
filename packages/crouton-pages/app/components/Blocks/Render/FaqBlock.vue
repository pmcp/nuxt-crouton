<script setup lang="ts">
/**
 * FAQ Block Public Renderer
 *
 * Renders a FAQ accordion using UAccordion for public display.
 */
import type { FaqBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: FaqBlockAttrs
}

const props = defineProps<Props>()

const accordionItems = computed(() => {
  return (props.attrs.items || []).map(item => ({
    label: item.question,
    content: item.answer
  }))
})
</script>

<template>
  <div class="faq-block">
    <div
      v-if="attrs.headline || attrs.title || attrs.description"
      class="text-center mb-8"
    >
      <p v-if="attrs.headline" class="text-sm font-medium text-primary mb-2">
        {{ attrs.headline }}
      </p>
      <h2 v-if="attrs.title" class="text-2xl sm:text-3xl font-bold mb-4">
        {{ attrs.title }}
      </h2>
      <p v-if="attrs.description" class="text-lg text-muted max-w-2xl mx-auto">
        {{ attrs.description }}
      </p>
    </div>

    <UAccordion
      :items="accordionItems"
      :type="attrs.allowMultiple ? 'multiple' : 'single'"
    />
  </div>
</template>
