<script setup lang="ts">
/**
 * Rich Text Block Public Renderer
 *
 * Renders HTML content with prose styling for public display.
 */
import type { RichTextBlockAttrs } from '../../../types/blocks'

interface Props {
  attrs: RichTextBlockAttrs
}

const props = defineProps<Props>()

/**
 * Minimal XSS sanitizer — strips <script> tags and on* event handler attributes.
 * SSR-safe: returns the original string unchanged when running server-side.
 */
function sanitizeHtml(html: string): string {
  if (typeof window === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  div.querySelectorAll('script').forEach(el => el.remove())
  div.querySelectorAll('*').forEach(el => {
    ;[...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name)
    })
  })
  return div.innerHTML
}

const sanitizedContent = computed(() => props.attrs.content ? sanitizeHtml(props.attrs.content) : '')
</script>

<template>
  <div
    v-if="sanitizedContent"
    class="prose prose-lg dark:prose-invert max-w-none"
    v-html="sanitizedContent"
  />
</template>
