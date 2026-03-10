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
  content?: string | Record<string, any> | null
}

const props = defineProps<Props>()

// Extract plain text from TipTap JSON document structure
function extractTextFromTipTap(node: any): string {
  if (!node) return ''
  if (typeof node === 'string') return node
  if (node.type === 'text') return node.text || ''
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromTipTap).join(node.type === 'doc' ? '\n' : '')
  }
  return ''
}

// Detect if content is TipTap JSON (object or JSON string with {"type":"doc"})
function parseTipTapJson(content: string | Record<string, any>): Record<string, any> | null {
  if (typeof content === 'object' && content?.type === 'doc') return content
  if (typeof content === 'string' && content.startsWith('{')) {
    try {
      const parsed = JSON.parse(content)
      if (parsed?.type === 'doc') return parsed
    } catch { /* not JSON */ }
  }
  return null
}

// Basic sanitization - strips script tags
// Full editor package provides proper sanitization
const sanitizedContent = computed(() => {
  if (!props.content) return ''

  const tiptapDoc = parseTipTapJson(props.content)
  if (tiptapDoc) {
    const text = extractTextFromTipTap(tiptapDoc).trim()
    // Convert newlines to <br> for display
    return text.replace(/\n/g, '<br>')
  }

  if (typeof props.content !== 'string') return ''
  return props.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
})
</script>
