<script setup lang="ts">
/**
 * AI Page Generator Stub
 *
 * This is a stub component that renders nothing.
 * When @fyit/crouton-ai is extended, it provides the real implementation
 * that overrides this stub.
 *
 * This allows Workspace/Editor.vue to always use <AIPageGenerator> without
 * checking if the AI package is available.
 */

interface LocaleOption {
  code: string
  name: string
}

// Accept all props that the real component accepts (for type safety)
defineProps<{
  availableLocales?: LocaleOption[]
  currentLocale?: string
}>()

defineModel<boolean>({ default: false })

// Emit nothing - this is a stub
defineEmits<{
  apply: [results: Array<{ locale: string, content: string, seoTitle: string, seoDescription: string }>]
}>()
</script>

<template>
  <!-- Stub renders nothing - real component provided by @fyit/crouton-ai -->
</template>
