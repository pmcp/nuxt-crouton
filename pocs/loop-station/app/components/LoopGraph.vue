<script setup lang="ts">
import { VueFlow, useVueFlow } from '@vue-flow/core'
import dagre from '@dagrejs/dagre'
import type { GraphNode, GraphEdge } from '~/composables/useLoopData'

const props = defineProps<{ nodes: GraphNode[]; edges: GraphEdge[] }>()

const flowNodes = ref<any[]>([])
const flowEdges = ref<any[]>([])
const { fitView, onNodesInitialized } = useVueFlow()

// fitView only works once nodes have measured dimensions — wait for that signal.
onNodesInitialized(() => fitView({ padding: 0.15 }))

const KIND_COLOR: Record<string, string> = {
  agent: 'var(--ko-accent-orange)',
  skill: 'var(--ko-accent-blue)',
  tool: '#6a798b',
  root: '#34d399'
}

// Node width scales with invocation count (∝ invocations); height is fixed.
function sizeFor(count: number, maxCount: number) {
  const w = 78 + Math.round((count / Math.max(1, maxCount)) * 90)
  return { width: w, height: 36 }
}

function layout() {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 26, ranksep: 78, marginx: 12, marginy: 12 })
  g.setDefaultEdgeLabel(() => ({}))

  // Ensure a synthetic root if any edge references it.
  const names = new Set(props.nodes.map((n) => n.name))
  const needRoot = props.edges.some((e) => e.from === 'root') || !names.has('root')
  const allNodes = [...props.nodes]
  if (needRoot && !names.has('root')) allNodes.unshift({ name: 'root', count: 1, kind: 'root', depth: -1 })

  const maxCount = Math.max(1, ...allNodes.map((n) => n.count))
  for (const n of allNodes) {
    const { width, height } = sizeFor(n.count, maxCount)
    g.setNode(n.name, { width, height })
  }
  for (const e of props.edges) {
    if (e.selfLoop) continue // self-loops don't constrain rank
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to)
  }
  dagre.layout(g)

  flowNodes.value = allNodes.map((n) => {
    const pos = g.node(n.name) || { x: 0, y: 0, width: 90, height: 36 }
    return {
      id: n.name,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
      data: { label: n.kind === 'root' ? 'root' : `${n.name} ·${n.count}` },
      style: {
        width: `${pos.width}px`,
        height: `${pos.height}px`,
        background: '#0c0c0c',
        border: `1px solid ${KIND_COLOR[n.kind] || '#6a798b'}`,
        color: KIND_COLOR[n.kind] || '#ccd6e0',
        borderRadius: '7px',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 0 10px -4px ${KIND_COLOR[n.kind] || '#000'}`
      }
    }
  })

  flowEdges.value = props.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.from,
    target: e.to,
    label: e.selfLoop ? '⟲' : e.count > 1 ? `×${e.count}` : '',
    animated: e.selfLoop,
    style: { stroke: e.selfLoop ? 'var(--ko-accent-red)' : '#2a3340', strokeWidth: e.selfLoop ? 2 : 1 },
    labelStyle: { fill: e.selfLoop ? 'var(--ko-accent-red)' : '#6a798b', fontFamily: 'var(--mono)', fontSize: '10px' }
  }))
}

onMounted(layout)
watch(() => [props.nodes, props.edges], layout, { deep: true })
</script>

<template>
  <div class="graph">
    <ClientOnly>
      <VueFlow
        :nodes="flowNodes"
        :edges="flowEdges"
        :default-viewport="{ zoom: 0.85 }"
        :min-zoom="0.2"
        :max-zoom="2"
        fit-view-on-init
        class="graph__flow"
      />
      <template #fallback>
        <div class="graph__loading">rendering loop graph…</div>
      </template>
    </ClientOnly>
    <div class="graph__legend">
      <span><i class="sw" style="background: var(--ko-accent-orange)" /> agent</span>
      <span><i class="sw" style="background: var(--ko-accent-blue)" /> skill</span>
      <span><i class="sw" style="background: #6a798b" /> tool</span>
      <span><i class="sw" style="background: var(--ko-accent-red)" /> ⟲ recursion</span>
    </div>
  </div>
</template>

<style scoped>
.graph { position: relative; height: 460px; display: flex; flex-direction: column; }
.graph__flow { flex: 1; background: #060606; border-radius: 6px; }
.graph__loading { flex: 1; display: grid; place-items: center; color: var(--ko-text-label); font-family: var(--mono); font-size: 12px; }
.graph__legend { display: flex; gap: 16px; padding-top: 8px; color: var(--ko-text-label); font-size: 11px; font-family: var(--mono); }
.graph__legend .sw { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
</style>
