import type { ThinkgraphDecision } from '../../layers/thinkgraph/collections/decisions/types'

interface GraphActionDeps {
  teamId: Ref<string | undefined>
  decisions: Ref<ThinkgraphDecision[]>
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
}

/**
 * Node operations: expand, star, pin, park, synthesize, resume, digest, brief, export, delete.
 */
export function useGraphActions(deps: GraphActionDeps) {
  const { teamId, decisions, selectedGraphId, expanding, contextMode, contextNodeIds, selectedNodes, chatNodeId, selectedNodeId, refreshDecisions, create, update, deleteItems, copyContext } = deps

  const { open } = useCrouton()
  const toast = useToast()
  const { copy } = useClipboard()

  // ─── AI Expand ───
  async function expandWithAI(decisionId: string, mode?: string) {
    if (expanding.value) return
    expanding.value = decisionId

    try {
      if (contextMode.value === 'selection' && contextNodeIds.value.length > 0) {
        await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/expand-with-context`, {
          method: 'POST',
          body: {
            nodeId: decisionId,
            mode: mode || 'default',
            contextNodeIds: contextNodeIds.value,
            includeAncestors: true,
          },
        })
      } else {
        await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/${decisionId}/expand`, {
          method: 'POST',
          body: { mode: mode || 'default' },
        })
      }
      await refreshDecisions()
    } catch (error) {
      console.error('AI expand failed:', error)
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
  async function synthesizeSelected() {
    if (selectedNodes.value.size < 2 || synthesizing.value) return
    synthesizing.value = true

    try {
      await $fetch(`/api/teams/${teamId.value}/thinkgraph-decisions/synthesize`, {
        method: 'POST',
        body: { nodeIds: Array.from(selectedNodes.value) },
      })
      selectedNodes.value.clear()
      await refreshDecisions()
    } catch (error) {
      console.error('Synthesis failed:', error)
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
      const result = await $fetch<{ briefing: string }>(`/api/teams/${teamId.value}/thinkgraph-decisions/resume`)
      if (result?.briefing) {
        await navigator.clipboard.writeText(result.briefing)
        toast.add({ title: 'Resume briefing copied to clipboard', icon: 'i-lucide-clipboard-check', color: 'success' })
      }
    } catch (error) {
      console.error('Resume failed:', error)
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
      const result = await $fetch<{ digest: string }>(`/api/teams/${teamId.value}/thinkgraph-decisions/digest`, {
        method: 'POST',
      })
      if (result?.digest) {
        digestContent.value = result.digest
        showDigest.value = true
      }
    } catch (error) {
      console.error('Digest generation failed:', error)
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
      const result = await $fetch<{ brief: string }>(`/api/teams/${teamId.value}/thinkgraph-decisions/brief`, {
        method: 'POST',
        body: { ids: Array.from(selectedNodes.value), format },
      })
      if (result?.brief) {
        await navigator.clipboard.writeText(result.brief)
      }
    } catch (error) {
      console.error('Brief generation failed:', error)
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

  async function createFromConnect(nodeType: string) {
    const { sourceNodeId } = connectMenu.value
    connectMenu.value.show = false

    if (!selectedGraphId.value) return

    await create({
      content: '',
      nodeType,
      pathType: '',
      graphId: selectedGraphId.value,
      parentId: sourceNodeId,
      source: 'manual',
      starred: false,
      branchName: '',
      versionTag: 'v1',
      model: '',
    })

    await refreshDecisions()

    const newest = decisions.value?.find(d => d.parentId === sourceNodeId && !d.content)
    if (newest) {
      open('update', 'thinkgraphDecisions', [newest.id])
    }
  }

  function closeConnectMenu() {
    connectMenu.value.show = false
  }

  // ─── Node delete ───
  async function onNodeDelete(nodeIds: string[]) {
    await deleteItems(nodeIds)
    for (const id of nodeIds) selectedNodes.value.delete(id)
    await refreshDecisions()
  }

  // ─── Export ───
  async function exportGraph(selectedGraph: { name: string; description?: string } | undefined) {
    if (!decisions.value?.length || !selectedGraph) return

    function renderNode(node: ThinkgraphDecision, depth: number): string {
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
