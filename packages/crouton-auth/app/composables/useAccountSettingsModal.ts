/**
 * useAccountSettingsModal
 *
 * Shared state for the account settings modal.
 * Used by public pages nav to open settings in a modal
 * instead of navigating to /account.
 */
const isOpen = ref(false)
const defaultTab = ref('profile')

export function useAccountSettingsModal() {
  function open(tab = 'profile') {
    defaultTab.value = tab
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen,
    defaultTab: readonly(defaultTab),
    open,
    close
  }
}
