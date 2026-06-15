<script setup lang="ts">
const props = defineProps<{
  title?: string
  nodeId?: string
}>()

const emit = defineEmits<{
  navigate: [nodeId: string]
}>()

// Inject the node navigation function from the parent canvas/page
const navigateToNode = inject<(nodeId: string) => void>('navigateToNode')

// Inject a title→nodeId resolver (populated from contextNodeIds mapping)
const resolveNodeTitle = inject<(title: string) => string | null>('resolveNodeTitle')

const resolved = computed(() => {
  if (props.nodeId) return props.nodeId
  if (props.title && resolveNodeTitle) return resolveNodeTitle(props.title)
  return null
})

const isUnresolved = computed(() => !resolved.value)

function handleClick(e: MouseEvent) {
  e.preventDefault()
  if (resolved.value && navigateToNode) {
    navigateToNode(resolved.value)
  }
}
</script>

<template>
  <a
    href="#"
    class="wiki-link"
    :class="{ 'wiki-link--unresolved': isUnresolved }"
    :data-node-id="resolved"
    :data-title="title"
    @click="handleClick"
  >
    <slot>{{ title || nodeId }}</slot>
  </a>
</template>

<style scoped>
.wiki-link {
  color: var(--ui-primary);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.wiki-link:hover {
  text-decoration-style: solid;
  opacity: 0.8;
}
.wiki-link--unresolved {
  color: var(--ui-text-muted);
  text-decoration-color: var(--ui-error);
  text-decoration-style: wavy;
}
</style>
