/**
 * useAuthModal
 *
 * Shared reactive state for the auth route modal.
 * Used by the router plugin (to open) and AuthRouteModal component (to render).
 */

export type AuthModalMode = 'login' | 'register' | 'forgot-password'

interface AuthModalState {
  open: boolean
  mode: AuthModalMode
  redirectTo: string
  previousPath: string
  prefillEmail?: string
  /**
   * When true, the modal can be dismissed (X / Esc / outside-click) and
   * restores `previousPath`. Used by the "staff door" on pages that have their
   * own gate behind them (e.g. a scoped kassa page falls back to the PIN gate),
   * so trying member login is never a dead-end. Hard auth requirements
   * (members/admin 401s) leave this false — there's nothing behind to fall back
   * to, so the only ways out are to succeed or deliberately leave.
   */
  dismissible?: boolean
}

export function useAuthModal() {
  const state = useState<AuthModalState>('crouton-auth-modal', () => ({
    open: false,
    mode: 'login',
    redirectTo: '/',
    previousPath: '/'
  }))

  function open(mode: AuthModalMode, redirectTo: string, previousPath: string, prefillEmail?: string, dismissible = false) {
    state.value = { open: true, mode, redirectTo, previousPath, prefillEmail, dismissible }
  }

  /**
   * Close the modal and restore the previous URL.
   * Called when the user dismisses the modal without authenticating.
   */
  function close() {
    if (import.meta.client && state.value.open) {
      window.history.replaceState(null, '', state.value.previousPath)
    }
    state.value.open = false
  }

  /**
   * Switch to a different auth mode and update the URL to match.
   * Called when the user clicks "Don't have an account?" etc.
   */
  function setMode(mode: AuthModalMode) {
    state.value.mode = mode
    if (import.meta.client) {
      window.history.replaceState(null, '', `/auth/${mode}`)
    }
  }

  return { state, open, close, setMode }
}
