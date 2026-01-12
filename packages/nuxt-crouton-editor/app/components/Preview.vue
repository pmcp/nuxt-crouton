<template>
  <div :class="containerClass">
    <!-- Inline preview (compact) -->
    <div
      v-if="mode === 'inline'"
      class="flex justify-between items-center border border-default rounded-md p-2 gap-2"
    >
      <div
        class="bg-muted/50 h-10 overflow-hidden prose prose-sm flex-1 text-[4px] rounded"
        v-html="renderedContent"
      />
      <UModal :title="title || 'Content preview'">
        <UButton
          icon="i-lucide-eye"
          size="xs"
          color="neutral"
          variant="ghost"
        />
        <template #body>
          <div
            class="prose prose-sm max-w-none dark:prose-invert"
            v-html="renderedContent"
          />
        </template>
      </UModal>
    </div>

    <!-- Panel preview (full) -->
    <div
      v-else
      class="border border-default rounded-lg overflow-hidden"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-default">
        <span class="text-sm font-medium text-muted">{{ title || 'Preview' }}</span>
        <div class="flex items-center gap-2">
          <!-- Variable indicators -->
          <div v-if="showVariableCount && variableCount > 0" class="flex items-center gap-1 text-xs text-muted">
            <UIcon name="i-lucide-braces" class="size-3" />
            <span>{{ variableCount }} variable{{ variableCount !== 1 ? 's' : '' }}</span>
          </div>
          <!-- Expand button -->
          <UModal v-if="expandable" :title="title || 'Preview'">
            <UButton
              icon="i-lucide-maximize-2"
              size="xs"
              color="neutral"
              variant="ghost"
            />
            <template #body>
              <div
                class="prose prose-sm max-w-none dark:prose-invert"
                v-html="renderedContent"
              />
            </template>
          </UModal>
        </div>
      </div>

      <!-- Content -->
      <div
        class="p-4 prose prose-sm max-w-none dark:prose-invert overflow-auto"
        :class="contentClass"
        v-html="renderedContent"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EditorVariable } from '../types/editor'

interface Props {
  /** Raw content with {{variables}} */
  content?: string
  /** Title for the preview panel/modal */
  title?: string
  /** Values for variable interpolation */
  values?: Record<string, string>
  /** Variable definitions (for getting sample values) */
  variables?: EditorVariable[]
  /** Display mode: inline (compact) or panel (full) */
  mode?: 'inline' | 'panel'
  /** Allow expanding to modal */
  expandable?: boolean
  /** Show variable count in header */
  showVariableCount?: boolean
  /** Custom container class */
  containerClass?: string
  /** Custom content area class */
  contentClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'panel',
  expandable: true,
  showVariableCount: true
})

/**
 * Get sample values from variable definitions
 */
const sampleValues = computed(() => {
  if (!props.variables?.length) return {}

  const samples: Record<string, string> = {}
  for (const variable of props.variables) {
    samples[variable.name] = variable.sample || `[${variable.label}]`
  }
  return samples
})

/**
 * Merge provided values with sample values
 */
const mergedValues = computed(() => ({
  ...sampleValues.value,
  ...props.values
}))

/**
 * Decode HTML entities in content for processing
 * TipTap sometimes encodes {{ as &#123;&#123; or &lbrace;&lbrace;
 */
function decodeEntities(content: string): string {
  return content
    .replace(/&#123;/g, '{')
    .replace(/&#125;/g, '}')
    .replace(/&lbrace;/g, '{')
    .replace(/&rbrace;/g, '}')
}

/**
 * Interpolate variables in content
 */
const renderedContent = computed(() => {
  if (!props.content) return ''

  // Decode HTML entities first
  let result = decodeEntities(props.content)

  // Replace variables with values or styled placeholders
  // Match {{variable_name}} with optional whitespace
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
    const value = mergedValues.value[varName]

    if (value !== undefined) {
      // Has a value - return it
      return value
    }

    // No value - show styled placeholder
    return `<span class="inline-flex items-center px-1.5 py-0.5 rounded bg-warning/20 text-warning text-xs font-mono">${match}</span>`
  })

  // If content doesn't have block-level HTML tags, convert line breaks to <br>
  // This handles plain text content or content with only inline formatting
  const hasBlockTags = /<(p|div|h[1-6]|ul|ol|li|blockquote|pre|table|hr)[>\s]/i.test(result)
  if (!hasBlockTags) {
    result = result.replace(/\n/g, '<br>')
  }

  return result
})

/**
 * Count variables in content
 */
const variableCount = computed(() => {
  if (!props.content) return 0

  const decoded = decodeEntities(props.content)
  const matches = decoded.match(/\{\{\s*\w+\s*\}\}/g)
  return matches ? new Set(matches).size : 0
})
</script>

<style scoped>
/* Ensure prose styles work in dark mode */
:deep(.prose) {
  --tw-prose-body: var(--ui-text-default);
  --tw-prose-headings: var(--ui-text-highlighted);
  --tw-prose-links: var(--ui-primary);
}

/* Ensure paragraphs have proper spacing */
:deep(.prose p) {
  margin-top: 1em;
  margin-bottom: 1em;
}

:deep(.prose p:first-child) {
  margin-top: 0;
}

:deep(.prose p:last-child) {
  margin-bottom: 0;
}

/* Empty paragraphs (line breaks) should still take space */
:deep(.prose p:empty) {
  min-height: 1em;
}
</style>
