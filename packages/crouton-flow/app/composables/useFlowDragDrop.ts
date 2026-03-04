import { ref } from 'vue'
import type { Ref } from 'vue'
import { useThrottleFn, useTimeoutFn } from '@vueuse/core'
import type { Node } from '@vue-flow/core'
import type { FlowPosition, CroutonDragData } from '../types/flow'
import type { useFlowSync } from './useFlowSync'

type FlowSyncState = ReturnType<typeof useFlowSync>

interface UseFlowDragDropDeps {
  syncState: FlowSyncState | null
  containerRef: Ref<HTMLElement | null>
  screenToFlowCoordinate: (pos: { x: number; y: number }) => { x: number; y: number }
  onDrop: (item: Record<string, unknown>, position: FlowPosition, collection: string) => void
}

/**
 * Manages external drag-and-drop onto the flow canvas.
 * Handles ghost node previews, drop validation, and sync broadcasting.
 */
export function useFlowDragDrop(
  props: {
    allowDrop: boolean
    allowedCollections: string[]
    autoCreateOnDrop: boolean
    sync: boolean
    collection: string
    labelField: string
  },
  deps: UseFlowDragDropDeps
) {
  const { syncState, containerRef, screenToFlowCoordinate, onDrop } = deps

  // Visual feedback for drag over
  const isDragOver = ref(false)

  // Local ghost node state (what this user is dragging)
  const localGhostNode = ref<Node | null>(null)

  // Delayed ghost cleanup (auto-cancels on unmount via useTimeoutFn)
  const { start: startGhostCleanup, stop: stopGhostCleanup } = useTimeoutFn(() => {
    localGhostNode.value = null
    if (props.sync && syncState) {
      syncState.clearGhostNode()
    }
  }, 1000, { immediate: false })

  // Throttled ghost node broadcast (sync every 50ms during dragover)
  const broadcastGhostNode = useThrottleFn((position: { x: number; y: number }) => {
    if (!props.sync || !syncState) return
    syncState.updateGhostNode({
      id: `ghost-${syncState.user.value?.id}`,
      title: 'New Node',
      collection: props.collection,
      position: { x: Math.round(position.x), y: Math.round(position.y) }
    })
  }, 50)

  /** Parse drag data from dataTransfer */
  function parseDragData(event: DragEvent): CroutonDragData | null {
    try {
      const data = event.dataTransfer?.getData('application/json')
      if (!data) return null
      const parsed = JSON.parse(data)
      if (parsed.type !== 'crouton-item') return null
      return parsed as CroutonDragData
    } catch {
      return null
    }
  }

  /** Check if a drag item is allowed to be dropped */
  function isDropAllowed(dragData: CroutonDragData): boolean {
    if (!props.allowDrop) return false
    if (props.allowedCollections && props.allowedCollections.length > 0) {
      return props.allowedCollections.includes(dragData.collection)
    }
    return true
  }

  /** Handle dragover - show ghost node at cursor position */
  function handleDragOver(event: DragEvent) {
    if (!props.allowDrop) return

    const types = event.dataTransfer?.types || []
    if (!types.includes('application/json')) return

    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
    isDragOver.value = true

    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    })

    const userName = (props.sync && syncState?.user.value?.name) || 'You'
    const userColor = (props.sync && syncState?.user.value?.color) || '#3b82f6'

    localGhostNode.value = {
      id: 'local-ghost',
      type: 'default',
      position: { x: position.x, y: position.y },
      data: {
        isGhost: true,
        title: 'New Node',
        userName,
        userColor
      },
      draggable: false,
      selectable: false
    }
    broadcastGhostNode(position)
  }

  /** Handle dragleave - clear ghost node */
  function handleDragLeave(event: DragEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null
    if (relatedTarget && containerRef.value?.contains(relatedTarget)) return

    isDragOver.value = false
    localGhostNode.value = null

    if (props.sync && syncState) {
      syncState.clearGhostNode()
    }
  }

  /** Handle drop - create node from dropped item */
  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDragOver.value = false
    stopGhostCleanup()

    if (!props.allowDrop) {
      localGhostNode.value = null
      if (props.sync && syncState) {
        syncState.clearGhostNode()
      }
      return
    }

    const dragData = parseDragData(event)
    if (!dragData || !isDropAllowed(dragData)) {
      localGhostNode.value = null
      if (props.sync && syncState) {
        syncState.clearGhostNode()
      }
      return
    }

    const position = screenToFlowCoordinate({
      x: event.clientX,
      y: event.clientY
    })

    const flowPosition: FlowPosition = {
      x: Math.round(position.x),
      y: Math.round(position.y)
    }

    if (props.autoCreateOnDrop && props.sync && syncState) {
      const item = dragData.item
      const id = String(item.id || crypto.randomUUID())
      const title = String(item[props.labelField] || 'Untitled')

      syncState.createNode({
        id,
        title,
        parentId: null,
        position: flowPosition,
        data: { ...item }
      })

      localGhostNode.value = null
      syncState.clearGhostNode()
    } else {
      if (localGhostNode.value) {
        localGhostNode.value = {
          ...localGhostNode.value,
          position: flowPosition,
          data: {
            ...localGhostNode.value.data,
            isPending: true
          }
        }
      }
      startGhostCleanup()
    }

    onDrop(dragData.item, flowPosition, dragData.collection)
  }

  return {
    isDragOver,
    localGhostNode,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    stopGhostCleanup
  }
}
