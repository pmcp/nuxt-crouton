<script setup lang="ts">
import { useVueFlow } from '@vue-flow/core'
import type { ThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/types'

interface Props {
  selectedNodeId: string | null
  nodes: ThinkgraphNode[]
  /** Set of node IDs matching search/filter. null = no filtering active */
  searchMatchIds?: Set<string> | null
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

// Build set of edge IDs that form the ancestor chain
function getAncestorEdgeIds(nodeId: string): Set<string> {
  const edgeIds = new Set<string>()
  let current = props.nodes.find(n => n.id === nodeId)
  while (current?.parentId) {
    edgeIds.add(`e-${current.parentId}-${current.id}`)
    current = props.nodes.find(n => n.id === current!.parentId)
  }
  return edgeIds
}

// Resolve context node IDs based on scope
function getContextNodeIds(nodeId: string): Set<string> {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return new Set([nodeId])

  const scope = node.contextScope || 'branch'

  if (scope === 'manual' && node.contextNodeIds) {
    const ids = Array.isArray(node.contextNodeIds)
      ? node.contextNodeIds as string[]
      : Object.keys(node.contextNodeIds)
    return new Set([nodeId, ...ids])
  }

  // branch or full: use ancestor chain
  const ancestorIds = getAncestorIds(nodeId)
  return new Set([nodeId, ...ancestorIds])
}

// Resolve context edge IDs based on scope
function getContextEdgeIds(nodeId: string): Set<string> {
  const node = props.nodes.find(n => n.id === nodeId)
  if (!node) return new Set()

  const scope = node.contextScope || 'branch'

  if (scope === 'manual' && node.contextNodeIds) {
    // For manual scope, highlight edges between the selected node and each manual context node
    const ids = Array.isArray(node.contextNodeIds)
      ? node.contextNodeIds as string[]
      : Object.keys(node.contextNodeIds)
    const edgeIds = new Set<string>()
    // Highlight any edge connecting two context nodes
    const contextSet = new Set([nodeId, ...ids])
    for (const edge of getEdges.value) {
      if (contextSet.has(edge.source) && contextSet.has(edge.target)) {
        edgeIds.add(edge.id)
      }
    }
    return edgeIds
  }

  return getAncestorEdgeIds(nodeId)
}

function clearHighlights() {
  for (const edge of getEdges.value) {
    edge.class = ''
    edge.style = undefined
  }
  for (const node of getNodes.value) {
    node.class = typeof node.class === 'string'
      ? node.class.replace(/\bcontext-dimmed\b/g, '').replace(/\bsearch-match\b/g, '').trim()
      : ''
  }
}

function applyHighlights() {
  const edges = getEdges.value
  const flowNodes = getNodes.value
  const nodeId = props.selectedNodeId
  const searchIds = props.searchMatchIds

  // If nothing active, clear
  if (!nodeId && !searchIds) {
    clearHighlights()
    return
  }

  // Context chain highlighting (when a node is selected)
  if (nodeId) {
    const contextNodeIds = getContextNodeIds(nodeId)
    const contextEdgeIds = getContextEdgeIds(nodeId)

    for (const edge of edges) {
      edge.class = contextEdgeIds.has(edge.id) ? 'context-chain-edge' : 'context-dimmed-edge'
      edge.style = undefined
    }

    for (const node of flowNodes) {
      const baseClass = typeof node.class === 'string'
        ? node.class.replace(/\bcontext-dimmed\b/g, '').replace(/\bsearch-match\b/g, '').trim()
        : ''
      if (!contextNodeIds.has(node.id)) {
        node.class = baseClass ? `${baseClass} context-dimmed` : 'context-dimmed'
      }
      else {
        node.class = baseClass
      }
    }
    return
  }

  // Search/filter highlighting (no node selected, but search is active)
  if (searchIds) {
    for (const edge of edges) {
      edge.class = ''
      edge.style = undefined
    }

    for (const node of flowNodes) {
      const baseClass = typeof node.class === 'string'
        ? node.class.replace(/\bcontext-dimmed\b/g, '').replace(/\bsearch-match\b/g, '').trim()
        : ''
      if (!searchIds.has(node.id)) {
        node.class = baseClass ? `${baseClass} context-dimmed` : 'context-dimmed'
      }
      else {
        node.class = baseClass ? `${baseClass} search-match` : 'search-match'
      }
    }
  }
}

watch([() => props.selectedNodeId, () => props.searchMatchIds], () => {
  applyHighlights()
}, { immediate: true })

// Clean up on unmount
onBeforeUnmount(() => {
  clearHighlights()
})
</script>

<template>
  <!-- Renderless component — only manages edge/node classes -->
  <div v-if="false" />
</template>
