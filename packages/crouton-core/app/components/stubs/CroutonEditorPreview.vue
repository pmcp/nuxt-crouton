<template>
  <div
    v-if="content"
    class="prose prose-sm dark:prose-invert max-w-none"
    v-html="sanitizedContent"
  />
  <span
    v-else
    class="text-muted"
  >
    —
  </span>
</template>

<script setup lang="ts">
// Stub component - overridden by nuxt-crouton-editor when installed
// Provides basic HTML preview fallback when the full editor package is not used

interface Props {
  content?: string | null
}

const props = defineProps<Props>()

// Basic sanitization - strips script tags
// Full editor package provides proper sanitization
const sanitizedContent = computed(() => {
  if (!props.content) return ''
  return props.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
})
</script>
