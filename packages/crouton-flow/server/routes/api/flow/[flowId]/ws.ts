/**
 * @deprecated DECOMMISSIONED — this file should be deleted.
 *
 * The old flow-specific WebSocket route has been superseded by the
 * unified collab endpoint in @fyit/crouton-collab:
 *
 *   /api/collab/[roomId]/ws?type=flow
 *
 * useFlowSync now wraps useCollabSync and connects to the collab endpoint
 * automatically. This file no longer exports a handler and the route is
 * effectively dead. A future cleanup pass should delete it entirely.
 *
 * Migration:
 * 1. useFlowSync uses /api/collab/[roomId]/ws?type=flow (crouton-collab)
 * 2. CollabRoom stores state in yjs_collab_states with room_type='flow'
 */

// This export satisfies Nitro's route file requirement without registering
// a live WebSocket handler.
export default {}
