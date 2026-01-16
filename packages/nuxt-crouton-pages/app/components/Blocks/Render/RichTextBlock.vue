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
</script>

<template>
  <div
    v-if="attrs.content"
    class="prose prose-lg dark:prose-invert max-w-none"
    v-html="attrs.content"
  />
</template>
