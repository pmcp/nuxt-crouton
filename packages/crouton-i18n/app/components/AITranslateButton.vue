<script setup lang="ts">
/**
 * AI Translate Button Stub
 *
 * This is a stub component that renders nothing.
 * When @fyit/crouton-ai is extended, it provides the real implementation
 * that overrides this stub.
 *
 * This allows CroutonI18nInput to always use <AITranslateButton> without
 * checking if the AI package is available.
 */

// Accept all props that the real component accepts (for type safety)
defineProps<{
  sourceText?: string
  sourceLanguage?: string
  targetLanguage?: string
  fieldType?: string
  existingTranslations?: Record<string, string>
  loading?: boolean
  disabled?: boolean
  tooltip?: string
  label?: string
  size?: '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  isBlockEditor?: boolean
  iconOnly?: boolean
}>()

// Emit nothing - this is a stub
defineEmits<{
  translate: [text: string]
  click: []
  error: [error: Error]
}>()
</script>

<template>
  <!-- Stub renders nothing - real component provided by @fyit/crouton-ai -->
</template>