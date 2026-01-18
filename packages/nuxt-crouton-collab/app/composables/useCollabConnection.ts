import * as Y from 'yjs'
import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue'
import type { CollabConnectionState, CollabRoomMessage, CollabAwarenessState } from '../types/collab'

export interface UseCollabConnectionOptions {
  /** Unique room identifier. Can be null to create inactive connection. */
  roomId: string | null
  /** Room type (e.g., 'page', 'flow', 'document') */
  roomType: string
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
}

export interface UseCollabConnectionReturn {
  // State
  connected: ComputedRef<boolean>
  synced: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // WebSocket
  ws: Ref<WebSocket | null>

  // Actions
  connect: () => void
  disconnect: () => void
  send: (data: string | ArrayBuffer | Uint8Array) => void

  // Awareness
  sendAwareness: (state: CollabAwarenessState) => void
  onAwareness: (callback: (users: CollabAwarenessState[]) => void) => void

  // Yjs
  ydoc: Y.Doc
}

/**
 * Low-level composable for managing WebSocket connections to CollabRoom
 *
 * Handles:
 * - WebSocket connection with exponential backoff reconnection
 * - Yjs document sync (binary messages)
 * - Awareness/presence (JSON messages)
 *
 * @example
 * ```ts
 * const {
 *   connected,
 *   synced,
 *   ydoc,
 *   connect,
 *   disconnect
 * } = useCollabConnection({
 *   roomId: 'page-123',
 *   roomType: 'page'
 * })
 * ```
 */
export function useCollabConnection(options: UseCollabConnectionOptions): UseCollabConnectionReturn {
  const { roomId, roomType, autoConnect = true } = options

  // Skip on SSR (check for window/document availability)
  const isServer = typeof window === 'undefined'

  // Yjs document
  const ydoc = new Y.Doc()

  // Connection state
  const state = ref<CollabConnectionState>({
    connected: false,
    synced: false,
    error: null
  })

  // WebSocket reference
  const ws = ref<WebSocket | null>(null)

  // Reconnection logic
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 10
  const BASE_RECONNECT_DELAY = 1000 // 1 second

  // Awareness callbacks
  const awarenessCallbacks: ((users: CollabAwarenessState[]) => void)[] = []

  // Track if intentionally disconnected
  let intentionalDisconnect = false

  /**
   * Build WebSocket URL from roomId and roomType
   */
  function buildWebSocketUrl(): string {
    if (isServer || !roomId) return ''

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/collab/${roomId}/ws?type=${roomType}`
  }

  /**
   * Connect to the collaboration room
   */
  function connect(): void {
    if (isServer || !roomId) return

    // Clean up existing connection
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }

    intentionalDisconnect = false
    const url = buildWebSocketUrl()

    try {
      const socket = new WebSocket(url)
      socket.binaryType = 'arraybuffer'
      ws.value = socket

      socket.onopen = () => {
        state.value = {
          connected: true,
          synced: false,
          error: null
        }
        reconnectAttempts = 0
      }

      socket.onmessage = (event) => {
        handleMessage(event)
      }

      socket.onclose = () => {
        state.value = {
          ...state.value,
          connected: false
        }
        ws.value = null

        // Attempt reconnect unless intentionally disconnected
        if (!intentionalDisconnect) {
          scheduleReconnect()
        }
      }

      socket.onerror = (event) => {
        console.error('[useCollabConnection] WebSocket error:', event)
        state.value = {
          ...state.value,
          error: new Error('WebSocket connection failed')
        }
      }

      // Send local Yjs updates to server
      console.log('[CollabConnection] Attaching ydoc update listener, ydoc guid:', ydoc.guid)
      ydoc.on('update', handleYjsUpdate)
    } catch (error) {
      console.error('[useCollabConnection] Failed to create WebSocket:', error)
      state.value = {
        ...state.value,
        error: error instanceof Error ? error : new Error('Failed to connect')
      }
    }
  }

  /**
   * Handle Yjs updates and send to server
   */
  function handleYjsUpdate(update: Uint8Array, origin: unknown): void {
    console.log('[CollabConnection] ydoc update triggered, origin:', origin, 'update size:', update.length)

    // Don't send updates that came from the server
    if (origin === 'remote') {
      console.log('[CollabConnection] Skipping remote origin update')
      return
    }

    // Send to server if connected
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('[CollabConnection] Sending Yjs update to server, size:', update.length)
      ws.value.send(update)
    } else {
      console.log('[CollabConnection] WebSocket not open, cannot send update. readyState:', ws.value?.readyState)
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  function handleMessage(event: MessageEvent): void {
    if (event.data instanceof ArrayBuffer) {
      // Binary message = Yjs update
      const update = new Uint8Array(event.data)
      Y.applyUpdate(ydoc, update, 'remote')

      // Mark as synced after first Yjs update
      if (!state.value.synced) {
        state.value = {
          ...state.value,
          synced: true
        }
      }
    } else if (typeof event.data === 'string') {
      // JSON message
      try {
        const message: CollabRoomMessage = JSON.parse(event.data)
        handleJsonMessage(message)
      } catch (error) {
        console.error('[useCollabConnection] Failed to parse message:', error)
      }
    }
  }

  /**
   * Handle JSON messages (awareness, ping/pong)
   */
  function handleJsonMessage(message: CollabRoomMessage): void {
    switch (message.type) {
      case 'awareness':
        // Broadcast to awareness callbacks
        if (message.users) {
          for (const callback of awarenessCallbacks) {
            callback(message.users)
          }
        }
        break

      case 'pong':
        // Heartbeat response - connection is alive
        break
    }
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  function scheduleReconnect(): void {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      state.value = {
        ...state.value,
        error: new Error('Max reconnection attempts reached')
      }
      return
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, ...
    const delay = BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts)

    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++
      connect()
    }, delay)
  }

  /**
   * Disconnect from the collaboration room
   */
  function disconnect(): void {
    intentionalDisconnect = true

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }

    if (ws.value) {
      // Only close if the WebSocket is OPEN or CLOSING
      // Closing a CONNECTING WebSocket causes console errors
      if (ws.value.readyState === WebSocket.OPEN || ws.value.readyState === WebSocket.CLOSING) {
        ws.value.close()
      } else if (ws.value.readyState === WebSocket.CONNECTING) {
        // WebSocket is still connecting - set up handler to close when it opens
        const socket = ws.value
        socket.onopen = () => {
          socket.close()
        }
      }
      ws.value = null
    }

    state.value = {
      connected: false,
      synced: false,
      error: null
    }
  }

  /**
   * Send raw data to the server
   */
  function send(data: string | ArrayBuffer | Uint8Array): void {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(data)
    }
  }

  /**
   * Send awareness state update
   */
  function sendAwareness(awarenessState: CollabAwarenessState): void {
    console.log('[CollabConnection] sendAwareness called, ws state:', ws.value?.readyState, 'OPEN:', WebSocket.OPEN)
    if (ws.value?.readyState === WebSocket.OPEN) {
      const message: CollabRoomMessage = {
        type: 'awareness',
        userId: awarenessState.user.id,
        state: awarenessState
      }
      console.log('[CollabConnection] Sending awareness message:', JSON.stringify(message))
      ws.value.send(JSON.stringify(message))
    } else {
      console.log('[CollabConnection] WebSocket not open, cannot send awareness')
    }
  }

  /**
   * Register a callback for awareness updates
   */
  function onAwareness(callback: (users: CollabAwarenessState[]) => void): void {
    awarenessCallbacks.push(callback)
  }

  // Lifecycle
  onMounted(() => {
    if (autoConnect && roomId) {
      connect()
    }
  })

  onUnmounted(() => {
    disconnect()
    ydoc.destroy()
  })

  return {
    // State
    connected: computed(() => state.value.connected),
    synced: computed(() => state.value.synced),
    error: computed(() => state.value.error),

    // WebSocket
    ws,

    // Actions
    connect,
    disconnect,
    send,

    // Awareness
    sendAwareness,
    onAwareness,

    // Yjs
    ydoc
  }
}

/**
 * Generate a consistent color from a user ID
 */
export function generateUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}
