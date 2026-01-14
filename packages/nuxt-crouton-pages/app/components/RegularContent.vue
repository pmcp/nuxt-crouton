<script setup lang="ts">
/**
 * Regular Page Content Component
 *
 * Renders rich text content from the editor for regular (non-app) pages.
 */

interface PageRecord {
  id: string
  title: string
  content?: string | null
}

interface Props {
  page: PageRecord
}

const props = defineProps<Props>()
</script>

<template>
  <article class="page-content prose prose-lg dark:prose-invert max-w-none">
    <div v-if="page.content" v-html="page.content" />
    <div v-else class="text-muted text-center py-12">
      <UIcon name="i-lucide-file-text" class="size-12 mb-4 mx-auto block" />
      <p>This page has no content yet.</p>
    </div>
  </article>
</template>

<style scoped>
.page-content {
  @apply px-4 py-6;
}

.page-content :deep(h1) {
  @apply text-3xl font-bold mb-4;
}

.page-content :deep(h2) {
  @apply text-2xl font-semibold mb-3 mt-8;
}

.page-content :deep(h3) {
  @apply text-xl font-semibold mb-2 mt-6;
}

.page-content :deep(p) {
  @apply mb-4 leading-relaxed;
}

.page-content :deep(ul),
.page-content :deep(ol) {
  @apply mb-4 pl-6;
}

.page-content :deep(li) {
  @apply mb-2;
}

.page-content :deep(a) {
  @apply text-primary hover:underline;
}

.page-content :deep(blockquote) {
  @apply border-l-4 border-primary pl-4 italic my-4;
}

.page-content :deep(code) {
  @apply bg-muted px-1.5 py-0.5 rounded text-sm;
}

.page-content :deep(pre) {
  @apply bg-muted p-4 rounded-lg overflow-x-auto my-4;
}

.page-content :deep(img) {
  @apply rounded-lg my-4 max-w-full h-auto;
}
</style>
