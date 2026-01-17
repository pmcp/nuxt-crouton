/**
 * Nuxt Crouton Collab UI Components
 *
 * These components are auto-imported when extending this layer.
 *
 * Available components:
 *
 * - `<CollabStatus>` - Connection status indicator (dot + label)
 * - `<CollabPresence>` - Stacked user avatars with overflow
 * - `<CollabCursors>` - Remote cursor overlay rendering
 * - `<CollabIndicator>` - Combined status + presence for toolbars
 *
 * @example Basic usage
 * ```vue
 * <template>
 *   <div class="relative">
 *     <!-- Header with status and users -->
 *     <div class="toolbar">
 *       <CollabIndicator
 *         :connected="connection.connected"
 *         :synced="connection.synced"
 *         :error="connection.error"
 *         :users="presence.otherUsers"
 *       />
 *     </div>
 *
 *     <!-- Content area with cursor overlay -->
 *     <div class="content relative">
 *       <CollabCursors :users="presence.otherUsers" />
 *       <!-- Your content here -->
 *     </div>
 *   </div>
 * </template>
 *
 * <script setup lang="ts">
 * const connection = useCollabConnection({ roomId: 'doc-123', roomType: 'page' })
 * const presence = useCollabPresence({ connection })
 * </script>
 * ```
 *
 * @example Individual components
 * ```vue
 * <!-- Just status dot -->
 * <CollabStatus
 *   :connected="true"
 *   :synced="true"
 *   :show-label="false"
 * />
 *
 * <!-- Just user avatars -->
 * <CollabPresence
 *   :users="users"
 *   :max-visible="4"
 *   size="md"
 * />
 *
 * <!-- Cursor overlay for canvas/editor -->
 * <CollabCursors
 *   :users="otherUsers"
 *   :show-labels="true"
 * />
 * ```
 */

// Components are auto-imported by Nuxt, no manual exports needed
// This file serves as documentation for the available components
export {}
