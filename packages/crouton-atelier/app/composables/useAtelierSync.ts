/**
 * Wraps crouton-collab's useCollabSync for Atelier-specific rooms.
 * Each Atelier project gets a Yjs room with Y.Map structure.
 */
export function useAtelierSync(projectId: string, teamId: string) {
  const { ymap, data, connected, synced, users, connection, connect, disconnect, ydoc } = useCollabSync({
    roomId: `atelier:${teamId}:${projectId}`,
    roomType: 'atelier',
    structure: 'map',
    autoConnect: true
  })

  return {
    ymap,
    data,
    connected,
    synced,
    users,
    connection,
    connect,
    disconnect,
    ydoc
  }
}
