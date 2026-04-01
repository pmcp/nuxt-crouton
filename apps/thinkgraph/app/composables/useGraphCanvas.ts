/**
 * Canvas state: edge types, layout, flow config, node positions.
 */
export function useGraphCanvas(teamId: Ref<string | undefined>, selectedGraphId: Ref<string | null>) {
  const expanding = ref<string | null>(null)
  const layoutKey = ref(0)

  // Edge type toggle
  const edgeTypes = ['default', 'smoothstep', 'straight'] as const
  const edgeType = ref<'default' | 'smoothstep' | 'straight'>('smoothstep')

  function cycleEdgeType() {
    const idx = edgeTypes.indexOf(edgeType.value)
    edgeType.value = edgeTypes[(idx + 1) % edgeTypes.length]
  }

  const edgeTypeIcon = computed(() => {
    switch (edgeType.value) {
      case 'default': return 'i-lucide-spline'
      case 'smoothstep': return 'i-lucide-git-commit-horizontal'
      case 'straight': return 'i-lucide-minus'
    }
  })

  const flowConfig = computed(() => ({
    direction: 'TB' as const,
    nodeSpacing: 80,
    rankSpacing: 160,
    nodeWidth: 260,
    nodeHeight: 200,
    edgeType: edgeType.value,
  }))

  function autoLayout() {
    savedPositions.value = null
    layoutKey.value++
  }

  // Flow config — persist node positions across reloads
  const flowId = ref<string | null>(null)
  const savedPositions = ref<Record<string, { x: number; y: number }> | null>(null)

  async function ensureFlowConfig() {
    if (!teamId.value || !selectedGraphId.value) return

    const flowName = `thinkgraph-${selectedGraphId.value}`

    try {
      const flows = await $fetch<any[]>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
        query: { collection: 'thinkgraphNodes', name: flowName },
      })
      const existing = flows?.find((f: any) => f.name === flowName)
      if (existing) {
        flowId.value = existing.id
        savedPositions.value = existing.nodePositions || null
        return
      }
    } catch { /* no existing config */ }

    try {
      const created = await $fetch<any>(`/api/crouton-flow/teams/${teamId.value}/flows`, {
        method: 'POST',
        body: {
          name: flowName,
          collection: 'thinkgraphNodes',
          labelField: 'content',
          parentField: 'parentId',
        },
      })
      if (created?.id) {
        flowId.value = created.id
      }
    } catch { /* flow config creation failed */ }
  }

  function resetCanvas() {
    flowId.value = null
    savedPositions.value = null
  }

  return {
    expanding,
    layoutKey,
    edgeType,
    edgeTypeIcon,
    flowConfig,
    flowId,
    savedPositions,
    cycleEdgeType,
    autoLayout,
    ensureFlowConfig,
    resetCanvas,
  }
}
