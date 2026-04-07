import { computed, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Node } from '@vue-flow/core'
import type { FlowPosition } from '../types/flow'
import type { YjsFlowNode, CollabAwarenessState } from '../types/yjs'
import type { useFlowSync } from './useFlowSync'

type FlowSyncState = ReturnType<typeof useFlowSync>

interface UseFlowSyncBridgeOptions {
  syncState: FlowSyncState | null
  rows: Ref<Record<string, unknown>[] | undefined>
  labelField: string
  parentField: string
  positionField: string
  /** Saved positions from flow_configs — used as fallback during Yjs seeding when rows lack position data */
  savedPositions?: Ref<Record<string, { x: number; y: number }> | null | undefined>
  localGhostNode: Ref<Node | null>
  stopGhostCleanup: () => void
}

/**
 * Bridges Yjs sync state to Vue Flow format.
 * Handles Yjs seeding from rows, row-to-Yjs sync, node/edge conversion,
 * ghost node cleanup, and remote user presence.
 */
export function useFlowSyncBridge(options: UseFlowSyncBridgeOptions) {
  const { syncState, rows, labelField, parentField, positionField, savedPositions, localGhostNode, stopGhostCleanup } = options

  /** Parse a raw position value (string JSON, object, or undefined) into FlowPosition */
  function parsePosition(rawPosition: unknown): FlowPosition | null {
    if (!rawPosition) return null
    if (typeof rawPosition === 'string') {
      try {
        return JSON.parse(rawPosition)
      } catch {
        return null
      }
    }
    if (typeof rawPosition === 'object' && 'x' in rawPosition && 'y' in rawPosition) {
      return rawPosition as FlowPosition
    }
    return null
  }

  // Track if Yjs was seeded from rows
  const seeded = ref(false)

  // Unified seeding watcher: watches BOTH synced and rows.length so it fires
  // regardless of which arrives first — fixes race condition where synced fires
  // before rows are loaded, or rows arrive before Yjs connects.
  watch(
    () => ({
      synced: syncState?.synced.value,
      rowCount: rows.value?.length ?? 0
    }),
    ({ synced, rowCount }) => {
      if (!synced || !syncState || seeded.value) return

      // Yjs already has nodes (from persisted state) — no seeding needed
      if (syncState.nodes.value.length > 0) {
        seeded.value = true
        return
      }

      // Yjs is empty but we have rows — seed from rows
      const currentRows = rows.value
      if (currentRows && currentRows.length > 0) {
        for (const row of currentRows) {
          const id = String(row.id || crypto.randomUUID())
          const title = String(row[labelField] || 'Untitled')
          const parentId = row[parentField] as string | null | undefined
          const position = parsePosition(row[positionField])
            || savedPositions?.value?.[id]
            || null

          syncState.createNode({
            id,
            title,
            parentId: parentId || null,
            position: position || { x: 0, y: 0 },
            data: { ...row }
          })
        }
        seeded.value = true
      }
    },
    { immediate: true }
  )

  // Watch for new/updated items in rows and sync them to Yjs
  watch(
    () => ({
      rows: rows.value,
      length: rows.value?.length ?? 0,
      seeded: seeded.value
    }),
    ({ rows: newRows, seeded: isSeeded }) => {
      if (!syncState || !isSeeded || !newRows) return

      const existingNodes = new Map(syncState.nodes.value.map(n => [n.id, n]))

      for (const row of newRows) {
        const id = String(row.id)
        const title = String(row[labelField] || 'Untitled')
        const parentId = row[parentField] as string | null | undefined
        const position = parsePosition(row[positionField])

        const existingNode = existingNodes.get(id)
        if (!existingNode) {
          syncState.createNode({
            id,
            title,
            parentId: parentId || null,
            position: position || { x: 0, y: 0 },
            data: { ...row }
          })
        } else {
          const titleChanged = existingNode.title !== title
          const parentChanged = existingNode.parentId !== (parentId || null)
          const dataChanged = JSON.stringify({ ...existingNode.data, [positionField]: undefined })
            !== JSON.stringify({ ...row, [positionField]: undefined })

          if (titleChanged || parentChanged || dataChanged) {
            // NOTE: this overwrites `data` with the row contents but does NOT
            // touch `node.ephemeral`. updateNode merges via spread, so any
            // ephemeral fields written by collaborators (e.g. live agent
            // activity from a worker) survive row refetches. This is the
            // whole reason `ephemeral` exists as a sibling of `data` —
            // see types/yjs.ts and packages/crouton-flow/CLAUDE.md.
            syncState.updateNode(id, {
              title,
              parentId: parentId || null,
              data: { ...row }
            })
          }
        }
      }

      // Handle deletions
      const rowIds = new Set(newRows.map(r => String(r.id)))
      for (const [nodeId] of existingNodes) {
        if (!rowIds.has(nodeId)) {
          syncState.deleteNode(nodeId)
        }
      }
    },
    { deep: true, immediate: true }
  )

  // Convert sync nodes to Vue Flow format
  const syncNodes = computed<Node[]>(() => {
    if (!syncState) return []

    return syncState.nodes.value.map((node: YjsFlowNode) => {
      const vfNode: Node = {
        id: node.id,
        type: node.nodeType || 'default',
        position: node.position,
        data: {
          ...node.data,
          id: node.id,
          title: node.title,
          parentId: node.parentId,
          // Yjs-only namespace surfaced under `data.ephemeral` so consuming
          // node components can read live collaborator state (e.g. agent
          // activity) via `props.data.ephemeral.<key>`. Vue Flow only
          // forwards `data` to custom node components, so a top-level
          // sibling field would not reach them — we namespace inside data
          // instead. The boundary stays honest at the Yjs layer where
          // `node.ephemeral` is a true sibling of `node.data`.
          ephemeral: node.ephemeral || {}
        },
        label: node.title
      }

      // Map containerId to Vue Flow's parentNode
      if (node.containerId) {
        vfNode.parentNode = node.containerId
      }

      // Map dimensions to style
      if (node.dimensions) {
        vfNode.style = {
          ...(node.style || {}),
          width: `${node.dimensions.width}px`,
          height: `${node.dimensions.height}px`,
        }
      } else if (node.style) {
        vfNode.style = { ...node.style }
      }

      return vfNode
    })
  })

  // Clear ghost when a real node appears near ghost position
  watch(
    () => syncNodes.value.length,
    (newLength, oldLength) => {
      if (newLength > oldLength && localGhostNode.value) {
        const ghostPos = localGhostNode.value.position
        const hasNodeNearGhost = syncNodes.value.some((node) => {
          const dx = Math.abs(node.position.x - ghostPos.x)
          const dy = Math.abs(node.position.y - ghostPos.y)
          return dx < 50 && dy < 50
        })

        if (hasNodeNearGhost) {
          localGhostNode.value = null
          if (syncState) {
            syncState.clearGhostNode()
          }
          stopGhostCleanup()
        }
      }
    }
  )

  // Generate edges from sync nodes
  const syncEdges = computed(() => {
    if (!syncState) return []

    const result: { id: string, source: string, target: string, type: string }[] = []
    const nodeIds = new Set(syncState.nodes.value.map((n: YjsFlowNode) => n.id))

    for (const node of syncState.nodes.value) {
      if (node.parentId && nodeIds.has(node.parentId)) {
        result.push({
          id: `e-${node.parentId}-${node.id}`,
          source: node.parentId,
          target: node.id,
          type: 'default'
        })
      }
    }

    return result
  })

  // Other users in the room (excluding current user)
  const otherUsersInRoom = computed<CollabAwarenessState[]>(() => {
    if (!syncState) return []
    const currentUserId = syncState.user.value?.id
    return syncState.users.value.filter((u: CollabAwarenessState) => u.user?.id !== currentUserId)
  })

  // Ghost nodes from other users' awareness (for multiplayer drag preview)
  const remoteGhostNodes = computed<Node[]>(() => {
    if (!syncState) return []

    const currentUserId = syncState.user.value?.id
    return syncState.users.value
      .filter((u: CollabAwarenessState) => u.user.id !== currentUserId && u.ghostNode)
      .map((u: CollabAwarenessState) => ({
        id: `ghost-${u.user.id}`,
        type: 'default',
        position: u.ghostNode!.position,
        data: {
          isGhost: true,
          title: (u as Record<string, unknown>).ghostNodeTitle || 'New Node',
          userName: u.user.name,
          userColor: u.user.color
        },
        draggable: false,
        selectable: false
      }))
  })

  return {
    syncNodes,
    syncEdges,
    otherUsersInRoom,
    remoteGhostNodes
  }
}
