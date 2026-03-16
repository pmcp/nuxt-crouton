<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

interface Props {
  selectedNodeId: string | null
  nodes: ThinkgraphNode[]
}

const props = defineProps<Props>()

const { getEdges, getNodes } = useVueFlow()

// Build ancestor chain for a given node
function getAncestorIds(nodeId: string): Set<string> {
  const ids = new Set<string>()
  let current = props.nodes.find(n => n.id === nodeId)
  while (current?.parentId) {
    ids.add(current.parentId)
    current = props.nodes.find(n => n.id === current!.parentId)
  }
  return ids
}

// Build set of edge IDs that form the context chain
function getContextEdgeIds(nodeId: string): Set<string> {
  const edgeIds = new Set<string>()
  let current = props.nodes.find(n => n.id === nodeId)
  while (current?.parentId) {
    edgeIds.add(`e-${current.parentId}-${current.id}`)
    current = props.nodes.find(n => n.id === current!.parentId)
  }
  return edgeIds
}

watch(() => props.selectedNodeId, (nodeId) => {
  const edges = getEdges.value
  const flowNodes = getNodes.value

  if (!nodeId) {
    // Clear all highlights
    for (const edge of edges) {
      edge.class = ''
      edge.style = undefined
    }
    for (const node of flowNodes) {
      node.class = typeof node.class === 'string'
        ? node.class.replace(/\bcontext-dimmed\b/g, '').trim()
        : ''
    }
    return
  }

  const ancestorIds = getAncestorIds(nodeId)
  const contextEdgeIds = getContextEdgeIds(nodeId)
  const contextNodeIds = new Set([nodeId, ...ancestorIds])

  // Highlight context chain edges
  for (const edge of edges) {
    if (contextEdgeIds.has(edge.id)) {
      edge.class = 'context-chain-edge'
      edge.style = undefined
    }
    else {
      edge.class = 'context-dimmed-edge'
      edge.style = undefined
    }
  }

  // Dim non-context nodes
  for (const node of flowNodes) {
    const baseClass = typeof node.class === 'string'
      ? node.class.replace(/\bcontext-dimmed\b/g, '').trim()
      : ''
    if (!contextNodeIds.has(node.id)) {
      node.class = baseClass ? `${baseClass} context-dimmed` : 'context-dimmed'
    }
    else {
      node.class = baseClass
    }
  }
}, { immediate: true })

// Clean up on unmount
onBeforeUnmount(() => {
  const edges = getEdges.value
  const flowNodes = getNodes.value
  for (const edge of edges) {
    edge.class = ''
    edge.style = undefined
  }
  for (const node of flowNodes) {
    node.class = typeof node.class === 'string'
      ? node.class.replace(/\bcontext-dimmed\b/g, '').trim()
      : ''
  }
})
</script>

<template>
  <!-- Renderless component — only manages edge/node classes -->
  <div v-if="false" />
</template>
