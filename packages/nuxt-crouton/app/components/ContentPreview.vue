<script setup lang="ts">
interface Props {
  content?: string
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  content: '',
  limit: 100
})

// Strip HTML tags and truncate
const strippedContent = computed(() => {
  if (!props.content) return ''
  // Remove HTML tags
  const text = props.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return text
})

const truncatedContent = computed(() => {
  if (strippedContent.value.length <= props.limit) {
    return strippedContent.value
  }
  return strippedContent.value.slice(0, props.limit).trim() + '...'
})

const isTruncated = computed(() => strippedContent.value.length > props.limit)
</script>

<template>
  <UTooltip v-if="isTruncated" :text="strippedContent" :ui="{ content: 'max-w-sm' }">
    <span class="text-sm text-muted">{{ truncatedContent }}</span>
  </UTooltip>
  <span v-else class="text-sm text-muted">{{ truncatedContent }}</span>
</template>
