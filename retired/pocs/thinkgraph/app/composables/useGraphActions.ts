import type { ThinkgraphNode } from '../../layers/thinkgraph/collections/nodes/types'

interface GraphActionDeps {
  teamId: Ref<string | undefined>
  decisions: Ref<ThinkgraphNode[]>
  selectedGraphId: Ref<string | null>
  expanding: Ref<string | null>
  contextMode: Ref<'path' | 'selection'>
  contextNodeIds: Ref<string[]>
  selectedNodes: Ref<Set<string>>
  chatNodeId: Ref<string | null>
  selectedNodeId: Ref<string | null>
  refreshDecisions: () => Promise<void>
  create: (data: Record<string, unknown>) => Promise<any>
  update: (id: string, data: Record<string, unknown>) => Promise<any>
  deleteItems: (ids: string[]) => Promise<any>
  copyContext: (nodeId: string) => Promise<void>
  focusInPath?: (nodeId: string) => void
}

/**
 * Node operations: expand, star, pin, park, synthesize, resume, digest, brief, export, delete.
 */
export function useGraphActions(deps: GraphActionDeps) {
  const { teamId, decisions, selectedGraphId, expanding, contextMode, contextNodeIds, selectedNodes, chatNodeId, selectedNodeId, refreshDecisions, create, update, deleteItems, copyContext, focusInPath } = deps

  const { open } = useCrouton()
  const toast = useToast()
  const { copy } = useClipboard()

  // ─── AI Expand ───
  async function expandWithAI(decisionId: string, mode?: string) {
    if (expanding.value) return
    expanding.value = decisionId

    try {
      if (contextMode.value === 'selection' && contextNodeIds.value.length > 0) {
        await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/expand-with-context`, {
          method: 'POST',
          body: {
            nodeId: decisionId,
            mode: mode || 'default',
            contextNodeIds: contextNodeIds.value,
            includeAncestors: true,
            graphId: selectedGraphId.value || '',
          },
        })
      } else {
        await $fetch(`/api/teams/${teamId.value}/thinkgraph-nodes/${decisionId}/expand`, {
          method: 'POST',
          body: { mode: mode || 'default', graphId: selectedGraphId.value || '' },
        })
      }
      await refreshDecisions()
      // Open the thinking path panel so the user can review suggestions
      focusInPath?.(decisionId)
    } catch (error: any) {
      console.error('AI expand failed:', error)
      toast.add({ title: 'Expand failed', description: error?.message || 'Could not expand node', color: 'error' })
    } finally {
      expanding.value = null
    }
  }

  // ─── Toggle operations ───
  async function toggleStar(nodeId: string) {
    const node = decisions.value?.find(d => d.id === nodeId)
    if (!node) return
    await update(nodeId, { starred: !node.starred })
    await refreshDecisions()
  }

  async function togglePin(nodeId: string) {
    const node = decisions.value?.find(d => d.id === nodeId)
    if (!node) return
    await update(nodeId, { pinned: !node.pinned })
    await refreshDecisions()
  }

  async function togglePark(nodeId: string) {
    const node = decisions.value?.find(d => d.id === nodeId)
    if (!node) return
    const newTag = node.versionTag === 'parked' ? 'v1' : 'parked'
    await update(nodeId, { versionTag: newTag })
    await refreshDecisions()
  }

  // ─── Synthesis ───
  const synthesizing = ref(false)
  async function synthesizeSelected(autoDispatch = false) {
    if (selectedNodes.value.size < 2 || synthesizing.value) return
    synthesizing.value = true

    const nodeIds = Array.from(selectedNodes.value)
    const titles = nodeIds
      .map(id => decisions.value?.find(d => d.id === id)?.title)
      .filter(Boolean)

    try {
      // Create a synthesis node with contextNodeIds pointing to selected nodes
      const node = await create({
        projectId: selectedGraphId.value || '',
        title: `Synthesis: ${titles.slice(0, 3).join(', ')}${titles.length > 3 ? '...' : ''}`,
        template: 'research',
        steps: ['synthesize'],
        status: autoDispatch ? 'queued' : 'idle',
        assignee: autoDispatch ? 'pi' : 'human',
        origin: 'human',
        contextScope: 'manual',
        contextNodeIds: nodeIds,
        parentId: nodeIds[0], // Use first selected as primary parent for tree positioning
      })

      selectedNodes.value = new Set()
      await refreshDecisions()

      if (autoDispatch && node?.id && teamId.value) {
        // Dispatch to Pi worker
        await $fetch(`/api/teams/${teamId.value}/dispatch/work-item`, {
          method: 'POST',
          body: { workItemId: node.id },
        })
        toast.add({ title: 'Synthesis node created and dispatched', color: 'success' })
      } else {
        toast.add({ title: 'Synthesis node created', color: 'success' })
      }
    } catch (error: any) {
      console.error('Synthesis failed:', error)
      toast.add({ title: 'Synthesis failed', description: error?.message || 'Could not create synthesis node', color: 'error' })
    } finally {
      synthesizing.value = false
    }
  }

  // ─── Resume briefing ───
  const resuming = ref(false)
  async function resumeGraph() {
    if (resuming.value) return
    resuming.value = true
    try {
      const result = await $fetch<{ briefing: string }>(`/api/teams/${teamId.value}/thinkgraph-nodes/resume`, {
        query: { graphId: selectedGraphId.value || '' },
      })
      if (result?.briefing) {
        await navigator.clipboard.writeText(result.briefing)
        toast.add({ title: 'Resume briefing copied to clipboard', icon: 'i-lucide-clipboard-check', color: 'success' })
      }
    } catch (error: any) {
      console.error('Resume failed:', error)
      toast.add({ title: 'Resume failed', description: error?.message || 'Could not generate resume briefing', color: 'error' })
    } finally {
      resuming.value = false
    }
  }

  // ─── Digest ───
  const showDigest = ref(false)
  const digestContent = ref('')
  const digestLoading = ref(false)

  async function generateDigest() {
    if (digestLoading.value) return
    digestLoading.value = true
    try {
      const result = await $fetch<{ digest: string }>(`/api/teams/${teamId.value}/thinkgraph-nodes/digest`, {
        method: 'POST',
        body: { graphId: selectedGraphId.value || '' },
      })
      if (result?.digest) {
        digestContent.value = result.digest
        showDigest.value = true
      }
    } catch (error: any) {
      console.error('Digest generation failed:', error)
      toast.add({ title: 'Digest failed', description: error?.message || 'Could not generate digest', color: 'error' })
    } finally {
      digestLoading.value = false
    }
  }

  // ─── Brief generation ───
  const generatingBrief = ref(false)
  async function generateBrief(format: string) {
    if (selectedNodes.value.size === 0 || generatingBrief.value) return
    generatingBrief.value = true

    try {
      const result = await $fetch<{ brief: string }>(`/api/teams/${teamId.value}/thinkgraph-nodes/brief`, {
        method: 'POST',
        body: { ids: Array.from(selectedNodes.value), format, graphId: selectedGraphId.value || '' },
      })
      if (result?.brief) {
        await navigator.clipboard.writeText(result.brief)
      }
    } catch (error: any) {
      console.error('Brief generation failed:', error)
      toast.add({ title: 'Brief generation failed', description: error?.message || 'Could not generate brief', color: 'error' })
    } finally {
      generatingBrief.value = false
    }
  }

  // ─── Context copy ───
  async function copySelectedContext() {
    for (const id of selectedNodes.value) {
      await copyContext(id)
    }
  }

  // ─── Chat add to graph ───
  async function onChatAddToGraph(items: Array<{ content: string; nodeType: string; parentId?: string }>) {
    const fallbackParentId = chatNodeId.value || selectedNodeId.value || ''
    for (const item of items) {
      await create({
        content: item.content,
        nodeType: item.nodeType,
        pathType: '',
        graphId: selectedGraphId.value || '',
        parentId: item.parentId || fallbackParentId,
        source: 'ai',
        starred: false,
        branchName: '',
        versionTag: '',
        model: '',
      })
    }
    await refreshDecisions()
  }

  // ─── Connect-to-create ───
  const connectMenu = ref<{ show: boolean; x: number; y: number; sourceNodeId: string; position: { x: number; y: number } }>({
    show: false, x: 0, y: 0, sourceNodeId: '', position: { x: 0, y: 0 },
  })

  function onConnectEnd(event: { sourceNodeId: string; sourceHandleType: string; position: { x: number; y: number }; mouseEvent: MouseEvent }) {
    connectMenu.value = {
      show: true,
      x: event.mouseEvent.clientX,
      y: event.mouseEvent.clientY,
      sourceNodeId: event.sourceNodeId,
      position: event.position,
    }
  }

  async function createFromConnect() {
    const { sourceNodeId } = connectMenu.value
    connectMenu.value.show = false

    if (!selectedGraphId.value) return

    const node = await create({
      title: '',
      template: 'idea',
      steps: [],
      status: 'idle',
      projectId: selectedGraphId.value,
      parentId: sourceNodeId,
      origin: 'human',
    })

    await refreshDecisions()

    if (node?.id) {
      open('update', 'thinkgraphNodes', [node.id])
    }
  }

  function closeConnectMenu() {
    connectMenu.value.show = false
  }

  // ─── Node delete ───
  async function onNodeDelete(nodeIds: string[]) {
    await deleteItems(nodeIds)
    const next = new Set(selectedNodes.value)
    for (const id of nodeIds) next.delete(id)
    selectedNodes.value = next
    await refreshDecisions()
  }

  // ─── Export ───
  async function exportGraph(selectedGraph: { name: string; description?: string } | undefined) {
    if (!decisions.value?.length || !selectedGraph) return

    function renderNode(node: ThinkgraphNode, depth: number): string {
      const indent = '  '.repeat(depth)
      const star = node.starred ? ' *' : ''
      const type = node.nodeType || 'idea'
      const lines: string[] = []
      lines.push(`${indent}- **[${type}]**${star} ${node.content}`)
      const children = decisions.value.filter(d => d.parentId === node.id)
      for (const child of children) {
        lines.push(renderNode(child, depth + 1))
      }
      return lines.join('\n')
    }

    const roots = decisions.value.filter(d => !d.parentId)
    const sections: string[] = []
    sections.push(`# ${selectedGraph.name}`)
    if (selectedGraph.description) {
      sections.push(selectedGraph.description)
    }
    sections.push(`\n**${decisions.value.length} nodes** | Exported ${new Date().toLocaleDateString()}\n`)

    const starred = decisions.value.filter(d => d.starred)
    if (starred.length) {
      sections.push('## Key Insights (starred)\n')
      for (const s of starred) {
        sections.push(`- **[${s.nodeType}]** ${s.content}`)
      }
      sections.push('')
    }

    sections.push('## Full Graph\n')
    for (const root of roots) {
      sections.push(renderNode(root, 0))
    }

    const markdown = sections.join('\n')
    await copy(markdown)
    toast.add({ title: 'Graph exported to clipboard', color: 'success' })
  }

  return {
    expandWithAI,
    toggleStar,
    togglePin,
    togglePark,
    synthesizing,
    synthesizeSelected,
    resuming,
    resumeGraph,
    showDigest,
    digestContent,
    digestLoading,
    generateDigest,
    generatingBrief,
    generateBrief,
    copySelectedContext,
    onChatAddToGraph,
    connectMenu,
    onConnectEnd,
    createFromConnect,
    closeConnectMenu,
    onNodeDelete,
    exportGraph,
  }
}
