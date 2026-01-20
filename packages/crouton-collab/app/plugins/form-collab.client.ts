/**
 * Form Collab Plugin (Client-only)
 *
 * Auto-initializes form presence tracking when crouton-collab is installed.
 * This plugin watches for slideover/modal state changes in useCrouton and
 * establishes WebSocket presence connections for active edit forms.
 *
 * The .client.ts suffix ensures this only runs on the client side.
 */
import { useFormCollabPresence } from '../composables/useFormCollabPresence'

export default defineNuxtPlugin(() => {
  // Initialize form collab presence tracking
  // This watches croutonStates and manages WebSocket connections
  useFormCollabPresence()
})
